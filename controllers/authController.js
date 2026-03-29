/**
 * controllers/authController.js
 *
 * 控制器（Controller）层：
 *   - 负责解析 HTTP 请求
 *   - 调用 service 层处理业务逻辑
 *   - 统一返回响应（成功或错误）
 *
 * 安全策略：
 *   - refreshToken 通过 HttpOnly Cookie 下发，JS 无法读写（防 XSS）
 *   - accessToken 短期有效，前端保存在内存中（不写 localStorage）
 */

const authService = require('../services/authService')
const userService = require('../services/userService')
const { encodeId } = require('../utils/obfuscate')
const bcrypt = require('bcryptjs')
// Cookie 策略也统一从配置中心读取，避免控制器里出现环境判断分支。
const config = require('../config')

// Cookie 配置（统一管理）
const REFRESH_TOKEN_COOKIE = 'refreshToken'
const COOKIE_OPTIONS = {
  httpOnly: true,                                          // JS 无法读取，防 XSS
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  maxAge: config.cookie.maxAge,
  path: '/'
}

// 只有在显式配置了域名时才写入 domain，避免本地开发时因为 domain 不匹配导致 Cookie 不生效。
if (config.cookie.domain) {
  COOKIE_OPTIONS.domain = config.cookie.domain
}

/**
 * 登录接口
 * POST /api/auth/login
 *
 * 请求体：{ username, password }
 *
 * 返回：
 *   - Cookie: refreshToken（HttpOnly）
 *   - Body: { user, accessToken }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body

    const result = await authService.login(username, password)

    // refreshToken → HttpOnly Cookie（JS 不可见）
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS)

    // 混淆用户 ID
    const safeUser = {
      ...result.user,
      id: encodeId(result.user.id)
    }

    // accessToken → Body（前端保存在内存中）
    res.json({
      user: safeUser,
      accessToken: result.accessToken
    })

  } catch (error) {
    next(error)
  }
}

/**
 * 刷新 accessToken
 * POST /api/auth/refresh
 *
 * refreshToken 由浏览器自动携带（Cookie），无需在 Body 中传递
 *
 * 返回：{ accessToken }
 */
async function refresh(req, res, next) {
  try {
    // 从 Cookie 读取，而非 req.body
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE]

    if (!refreshToken) {
      return res.status(401).json({
        code: 'NO_REFRESH_TOKEN',
        message: '未找到刷新令牌，请重新登录'
      })
    }

    const result = await authService.refreshAccessToken(refreshToken)

    const safeUser = result.user
      ? { ...result.user, id: encodeId(result.user.id) }
      : undefined

    res.json({
      accessToken: result.accessToken,
      ...(safeUser && { user: safeUser })
    })

  } catch (error) {
    next(error)
  }
}

/**
 * 登出接口
 * POST /api/auth/logout
 *
 * 清除 HttpOnly Cookie + 后端吊销 refreshToken
 */
async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE]

    // 即使没有 token 也清除 Cookie，保证登出成功
    if (refreshToken) {
      await authService.logout(refreshToken).catch(() => { })
    }

    // 清除 Cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' })

    res.json({ message: '已登出' })

  } catch (error) {
    next(error)
  }
}

/**
 * 修改个人密码
 * POST /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body
    const userId = req.user.id  // 由 authMiddleware 注入

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        code: 'PARAM_ERROR',
        message: '旧密码和新密码不能为空'
      })
    }

    // 1. 获取当前用户及密码哈希
    const user = await userService.findUserByIdWithPassword(userId)
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      })
    }

    // 2. 校验旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isMatch) {
      return res.status(400).json({
        code: 'PWD_ERROR',
        message: '旧密码不正确'
      })
    }

    // 3. 更新密码（userService.updateUser 内部已包含加盐哈希处理）
    await userService.updateUser(Number(userId), { password: newPassword })

    res.json({ message: '密码修改成功' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  login,
  refresh,
  logout,
  changePassword
}

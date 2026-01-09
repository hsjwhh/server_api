/**
 * controllers/authController.js
 *
 * 控制器（Controller）层：
 *   - 负责解析 HTTP 请求
 *   - 调用 service 层处理业务逻辑
 *   - 统一返回响应（成功或错误）
 *
 * 注意：
 *   - Controller 不写任何业务逻辑
 *   - 不生成 token、不查数据库、不做权限判断
 *   - 所有业务逻辑都放在 service 层（authService.js）
 */

const authService = require('../services/authService')

/**
 * 登录接口
 * POST /api/auth/login
 *
 * 请求体：
 *   { username, password }
 *
 * 返回：
 *   {
 *     user: { id, username, role },
 *     accessToken: "...",
 *     refreshToken: "..."
 *   }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body

    // 调用 service 层处理登录逻辑
    const result = await authService.login(username, password)

    // 登录成功，返回用户信息 + token
    res.json(result)

  } catch (error) {
    next(error)
  }
}

/**
 * 刷新 accessToken
 * POST /api/auth/refresh
 *
 * 请求体：
 *   { refreshToken }
 *
 * 返回：
 *   { accessToken }
 *
 * 用途：
 *   - accessToken 过期后，前端自动调用此接口
 *   - refreshToken 长期有效，用于换取新的 accessToken
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body

    // 调用 service 层生成新的 accessToken
    const result = await authService.refreshAccessToken(refreshToken)

    res.json(result)

  } catch (error) {
    next(error)
  }
}

/**
 * 登出接口
 * POST /api/auth/logout
 *
 * 请求体：
 *   { refreshToken }
 *
 * 返回：
 *   { message: '已登出' }
 *
 * 用途：
 *   - 删除 refreshToken，使其无法再刷新 accessToken
 *   - 相当于彻底退出登录
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body

    await authService.logout(refreshToken)

    res.json({ message: '已登出' })

  } catch (error) {
    next(error)
  }
}

module.exports = {
  login,
  refresh,
  logout
}

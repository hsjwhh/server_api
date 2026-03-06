/**
 * services/authService.js
 *
 * Service 层（业务逻辑层）：
 *   - 不处理 HTTP 请求（那是 controller 的职责）
 *   - 不处理路由（那是 router 的职责）
 *   - 不处理权限验证（那是 middleware 的职责）
 *
 * 本文件只负责：
 *   ✔ 用户验证（从 MySQL 查询 + bcrypt 校验）
 *   ✔ 生成 accessToken（短期有效）
 *   ✔ 生成 refreshToken（长期有效）
 *   ✔ 存储 refreshToken（内存示例，可替换为数据库）
 *   ✔ 刷新 accessToken
 *   ✔ 登出（删除 refreshToken）
 */

const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const userService = require('./userService')   // 使用数据库查询用户
const { AuthError } = require('../utils/errors')

/**
 * ================================
 * 1. Token 生成函数
 * ================================
 */

/**
 * 生成 Access Token（短期有效）
 * @param {object} payload - 写入 token 的用户信息
 * @returns {string} accessToken
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m' // 15 分钟有效期
  })
}

/**
 * 生成 Refresh Token（长期有效）
 * @param {object} payload
 * @returns {string} refreshToken
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' // 7 天有效期
  })
}

/**
 * ================================
 * 2. refreshToken 存储（示例）
 * ================================
 *
 * 这里使用内存数组存储 refreshToken：
 *   - 简单易用
 *   - 适合开发阶段
 *
 * 生产环境建议改为：
 *   - MySQL 表（refresh_tokens）
 *   - Redis（更快）
 *   - 或者 JWT 黑名单机制
 */
let refreshTokensStore = []

/**
 * ================================
 * 3. 登录逻辑（数据库版本）
 * ================================
 *
 * @param {string} username
 * @param {string} password
 * @returns {object} { user, accessToken, refreshToken }
 */
async function login(username, password) {
  // 1. 从数据库查询用户
  const user = await userService.findUserByUsername(username)

  // 用户不存在时，仍执行一次 bcrypt.compare（dummy）
  // 目的：防止攻击者通过响应时间差判断用户是否存在（时序一致性防为主）
  if (!user) {
    await bcrypt.compare(password, '$2b$10$dummyhashfortiminggxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    throw new AuthError('用户名或密码错误', 'AUTH_INVALID_CREDENTIALS')
  }

  // 2. 用户存在但已禁用 (状态 1 表示正常，0 表示禁用)
  if (user.status !== 1) {
    // 同样不透露是哪个原因，延迟后再抛出（时序一致）
    await bcrypt.compare(password, '$2b$10$dummyhashfortiminggxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    throw new AuthError('用户名或密码错误', 'AUTH_INVALID_CREDENTIALS')
  }

  // 3. 校验密码（bcrypt 对比明文密码 vs 哈希）
  const isMatch = await bcrypt.compare(password, user.password_hash)

  if (!isMatch) {
    throw new AuthError('用户名或密码错误', 'AUTH_INVALID_CREDENTIALS')
  }

  // 4. 构造写入 token 的 payload（不要包含密码）
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  }

  // 5. 生成 token
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // 6. 存储 refreshToken（未来会改成数据库）
  refreshTokensStore.push(refreshToken)

  return {
    user: payload,
    accessToken,
    refreshToken
  }
}

/**
 * ================================
 * 4. 刷新 accessToken
 * ================================
 *
 * @param {string} refreshToken
 * @returns {object} { accessToken }
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AuthError('缺少 refresh token', 'AUTH_REFRESH_TOKEN_MISSING')
  }

  if (!refreshTokensStore.includes(refreshToken)) {
    throw new AuthError('refresh token 无效或已登出', 'AUTH_REFRESH_TOKEN_INVALID')
  }

  // 异步化 jwt.verify
  const decodedUser = await new Promise((resolve, reject) => {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return reject(new AuthError('refresh token 无效或已过期', 'AUTH_REFRESH_TOKEN_EXPIRED'))
      }
      resolve(decoded)
    })
  })

  // 补一次数据库查询，确认用户状态仍然有效
  // （封号、删除用户后防止用旧 refreshToken 继续获取 accessToken）
  const currentUser = await userService.findUserByUsername(decodedUser.username)
  if (!currentUser || currentUser.status !== 1) {
    // token 仍在内存列表中，主动撤销
    refreshTokensStore = refreshTokensStore.filter(t => t !== refreshToken)
    throw new AuthError('账号已停用，请重新登录', 'AUTH_USER_DISABLED')
  }

  const payload = {
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role
  }

  const newAccessToken = generateAccessToken(payload)

  return { accessToken: newAccessToken }
}

/**
 * ================================
 * 5. 登出逻辑
 * ================================
 *
 * @param {string} refreshToken
 * @returns {object}
 */
async function logout(refreshToken) {
  // 从存储中删除 refreshToken
  refreshTokensStore = refreshTokensStore.filter((t) => t !== refreshToken)

  return {
    success: true
  }
}

module.exports = {
  login,
  refreshAccessToken,
  logout
}
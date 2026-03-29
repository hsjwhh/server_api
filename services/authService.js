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
const { query } = require('../db')
const userService = require('./userService')   // 使用数据库查询用户
const { AuthError } = require('../utils/errors')
// 所有 token 相关配置集中来源于配置中心，方便统一替换 secret、过期时间和环境策略。
const config = require('../config')

/**
 * ================================
 * 1. Token 生成与辅助函数
 * ================================
 */

function generateAccessToken(payload) {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn
  })
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, config.auth.jwtRefreshSecret, {
    expiresIn: config.auth.jwtRefreshExpiresIn
  })
}

/**
 * 解析过期时间配置并返回 Date 对象
 * 例如 '7d' -> 7天后的日期
 */
function getExpiresAt(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 默认 7 天

  const value = parseInt(match[1])
  const unit = match[2]
  const msMap = { s: 1000, m: 60000, h: 3600000, d: 86400000 }
  
  return new Date(Date.now() + value * msMap[unit])
}

/**
 * ================================
 * 2. 核心业务逻辑
 * ================================
 */

/**
 * 登录逻辑
 */
async function login(username, password) {
  // 1. 从数据库查询用户
  const user = await userService.findUserByUsername(username)

  if (!user || user.status !== 1) {
    await bcrypt.compare(password, '$2b$10$dummyhashfortiminggxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    throw new AuthError('用户名或密码错误', 'AUTH_INVALID_CREDENTIALS')
  }

  // 2. 校验密码
  const isMatch = await bcrypt.compare(password, user.password_hash)
  if (!isMatch) {
    throw new AuthError('用户名或密码错误', 'AUTH_INVALID_CREDENTIALS')
  }

  // 3. 构造 payload
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  }

  // 4. 生成 token
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // 5. 存储 refreshToken 到数据库
  const expiresAt = getExpiresAt(config.auth.jwtRefreshExpiresIn)
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshToken, expiresAt]
  )

  // 非阻塞清理：删除当前用户的过期和已吊销 token，不影响登录主流程
  query(
    'DELETE FROM refresh_tokens WHERE user_id = ? AND (expires_at < NOW() OR revoked = 1)',
    [user.id]
  ).catch(err => console.error('[cleanupTokens] 清理失败:', err))

  return {
    user: payload,
    accessToken,
    refreshToken
  }
}

/**
 * 刷新 accessToken
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AuthError('缺少 refresh token', 'AUTH_REFRESH_TOKEN_MISSING')
  }

  // 1. 数据库校验：是否存在、是否已吊销、是否过期
  const rows = await query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1',
    [refreshToken]
  )
  
  if (rows.length === 0) {
    throw new AuthError('refresh token 无效、已过期或已登出', 'AUTH_REFRESH_TOKEN_INVALID')
  }

  const tokenRecord = rows[0]

  // 2. 签名校验
  const decodedUser = await new Promise((resolve, reject) => {
    jwt.verify(refreshToken, config.auth.jwtRefreshSecret, (err, decoded) => {
      if (err) return reject(new AuthError('refresh token 签名无效', 'AUTH_REFRESH_TOKEN_EXPIRED'))
      resolve(decoded)
    })
  })

  // 3. 确认用户状态
  const currentUser = await userService.findUserByUsername(decodedUser.username)
  if (!currentUser || currentUser.status !== 1) {
    // 标记该 token 无效
    await query('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [tokenRecord.user_id])
    throw new AuthError('账号已停用，请重新登录', 'AUTH_USER_DISABLED')
  }

  const payload = {
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role
  }

  const newAccessToken = generateAccessToken(payload)

  return {
    accessToken: newAccessToken,
    user: payload
  }
}

/**
 * 登出逻辑
 */
async function logout(refreshToken) {
  // 采用标准吊销逻辑：不删除记录，而是标记为已吊销并记录时间
  await query(
    'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE token = ? AND revoked = 0',
    [refreshToken]
  )

  return {
    success: true
  }
}

/**
 * 吊销指定用户的所有 refresh token
 * 用于密码修改、账号异常等场景，强制所有端重新登录
 */
async function revokeAllUserTokens(userId) {
  await query(
    'UPDATE refresh_tokens SET revoked = 1, revoked_at = NOW() WHERE user_id = ? AND revoked = 0',
    [userId]
  )
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  revokeAllUserTokens
}

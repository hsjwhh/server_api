/**
 * middleware/authMiddleware.js
 *
 * JWT 鉴权中间件（路由守卫）：
 *   - 用于保护需要登录才能访问的接口
 *   - 验证 accessToken 是否存在、是否有效、是否过期
 *   - 验证成功后，将用户信息写入 req.user
 *
 * 使用方式（在 server.js 或路由文件中）：
 *   app.use('/api/sn', authMiddleware, snRouter)
 *
 * 说明：
 *   - accessToken 是短期有效的（例如 15 分钟）
 *   - 如果 accessToken 过期，前端会自动调用 /api/auth/refresh 获取新的 token
 */

const jwt = require('jsonwebtoken')
// 全局路由错误信息
const { AuthError } = require('../utils/errors.js')

/**
 * 鉴权中间件
 *
 * 逻辑流程：
 *   1. 从请求头中获取 Authorization 字段
 *   2. 检查格式是否为 "Bearer xxx"
 *   3. 使用 JWT_SECRET 验证 token 是否有效
 *   4. 验证成功 → 将用户信息写入 req.user
 *   5. 验证失败 → 返回 401（未授权）
 */
function authMiddleware(req, res, next) {
  /**
   * 从请求头中获取 Authorization 字段
   * 格式通常为：
   *   Authorization: Bearer xxxxx.yyyyy.zzzzz
   */
  const authHeader = req.headers['authorization']

  // 如果没有 Authorization 字段，直接拒绝访问
  if (!authHeader) {
    return next(new AuthError('未提供 Authorization 请求头', 'AUTH_HEADER_MISSING'))
  }

  /**
   * 从 Authorization 中提取 token
   * authHeader.split(' ') 会得到：
   *   ['Bearer', 'xxxxx.yyyyy.zzzzz']
   */
  const token = authHeader.split(' ')[1]

  // 如果格式不正确（例如没有 Bearer 或没有 token）
  if (!token) {
    return next(new AuthError('Authorization 格式错误，应为 Bearer <token>', 'AUTH_TOKEN_FORMAT_ERROR'))
  }

  /**
   * 使用 JWT_SECRET 验证 token 是否有效
   * jwt.verify 会自动检查：
   *   - token 是否被篡改
   *   - token 是否过期
   */
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      // token 无效或已过期
      return next(new AuthError('token 无效或已过期', 'AUTH_TOKEN_INVALID'))
    }

    /**
     * decodedUser 是当初生成 token 时写入的 payload：
     *   { id, username, role, iat, exp }
     *
     * 我们将其挂载到 req.user，方便后续业务逻辑使用
     */
    req.user = decodedUser

    // 鉴权通过，继续执行后续路由
    next()
  })
}

module.exports = authMiddleware

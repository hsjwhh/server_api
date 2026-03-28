/**
 * middleware/requirePermission.js
 *
 * 权限守卫中间件
 * 依赖：必须挂在 authMiddleware 之后，因为需要 req.user.role
 */

const ROLE_PERMISSIONS = {
  // 管理员：通配，拥有所有权限
  admin: [
    '*:*',
    'user:manage'
  ],

  // 普通用户：仅限查询类权限
  user: [
    'dashboard:view',
    'server:read',
    'cpu:read',
    'mb:read',
    'sn:check'
  ]
}

const requirePermission = (requiredCode) => {
  return (req, res, next) => {
    const user = req.user

    if (!user || !user.role) {
      return res.status(401).json({
        code: 'AUTH_TOKEN_INVALID',
        message: '未授权：无法获取用户角色'
      })
    }

    const permissions = ROLE_PERMISSIONS[user.role] || []
    const hasPermission = permissions.includes('*:*') || permissions.includes(requiredCode)

    if (hasPermission) {
      return next()
    }

    console.warn(`[Permission Denied] User:${user.username} Role:${user.role} Action:${requiredCode}`)
    return res.status(403).json({
      code: 'PERMISSION_DENIED',
      message: '权限不足：您没有执行此操作的权限'
    })
  }
}

module.exports = requirePermission

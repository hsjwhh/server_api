/**
 * routes/authRoutes.js
 *
 * 登录系统路由层：
 *   - 只负责 URL → Controller 的映射
 *   - 不写业务逻辑、不写 token 生成、不写数据库操作
 *
 * 最终挂载路径（在 server.js 中）：
 *   app.use('/api/auth', authRoutes)
 *
 * 所以这里的相对路径如下：
 *   POST /login
 *   POST /refresh
 *   POST /logout
 */

const express = require('express')
const router = express.Router()

// 引入控制器（真正的业务逻辑在 controller 中）
const authController = require('../controllers/authController')

/**
 * POST /api/auth/login
 *
 * 登录接口：
 *   - 请求体：{ username, password }
 *   - 返回：{ user, accessToken, refreshToken }
 *
 * 说明：
 *   - 登录不需要 authMiddleware，因为用户还没有 token
 */
router.post('/login', authController.login)

/**
 * POST /api/auth/refresh
 *
 * 刷新 accessToken：
 *   - 请求体：{ refreshToken }
 *   - 返回：{ accessToken }
 *
 * 说明：
 *   - refreshToken 是长期有效的
 *   - accessToken 过期后，前端会自动调用此接口
 *   - 不需要 authMiddleware，因为 accessToken 已经过期
 */
router.post('/refresh', authController.refresh)

/**
 * POST /api/auth/logout
 *
 * 登出接口：
 *   - 请求体：{ refreshToken }
 *   - 返回：{ message: '已登出' }
 *
 * 说明：
 *   - 后端会把 refreshToken 从存储中删除
 *   - 这样用户就无法再刷新 token，相当于彻底退出
 */
router.post('/logout', authController.logout)

module.exports = router

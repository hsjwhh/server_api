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
const rateLimit = require('express-rate-limit')

const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')

/**
 * 限流配置
 *
 * loginLimiter:   防暴力破解 —— 15 分钟内同一 IP 最多 10 次登录请求
 * refreshLimiter: 防滥刷 token —— 15 分钟内同一 IP 最多 30 次刷新请求
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 分钟窗口
    max: 10,                    // 最多 10 次
    standardHeaders: true,      // 返回 RateLimit-* 响应头
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: '登录尝试过于频繁，请 15 分钟后再试'
    }
})

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        code: 'TOO_MANY_REQUESTS',
        message: '请求过于频繁，请稍后再试'
    }
})

/**
 * POST /api/auth/login
 *
 * 登录接口：
 *   - 请求体：{ username, password }
 *   - 返回：{ user, accessToken }（refreshToken 通过 HttpOnly Cookie 下发）
 */
router.post('/login', loginLimiter, authController.login)

/**
 * POST /api/auth/refresh
 *
 * 刷新 accessToken：
 *   - refreshToken 通过 HttpOnly Cookie 自动携带
 *   - 返回：{ accessToken }
 */
router.post('/refresh', refreshLimiter, authController.refresh)

/**
 * POST /api/auth/logout
 *
 * 登出接口：
 *   - 清除 HttpOnly Cookie
 *   - 返回：{ message: '已登出' }
 */
router.post('/logout', authController.logout)

/**
 * POST /api/auth/change-password
 * 修改个人密码，需要 Token 鉴权
 * 请求体：{ oldPassword, newPassword }
 */
router.post('/change-password', authMiddleware, authController.changePassword)

/**
 * Session 管理
 */
// 1. 查看自己的活跃会话列表
router.get('/sessions', authMiddleware, authController.listMySessions)

// 2. 吊销所有其他会话（保留当前）
router.delete('/sessions', authMiddleware, authController.revokeMySession)

// 3. 吊销指定会话
router.delete('/sessions/:id', authMiddleware, authController.revokeMySession)

module.exports = router

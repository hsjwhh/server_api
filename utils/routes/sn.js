/**
 * routes/sn.js
 *
 * SN 查询模块路由层：
 *   - 只负责 URL → Controller 的映射
 *   - 不写任何业务逻辑、不写 SQL、不做权限判断
 *
 * 权限控制说明：
 *   - SN 路由的 JWT 验证已在 server.js 中统一处理：
 *       app.use("/api/sn", authMiddleware, snRouter)
 *   - 所以本文件无需再引入 authMiddleware，避免重复鉴权
 */

const express = require('express')
const router = express.Router()

const snController = require('../controllers/snController')

/**
 * GET /api/sn
 *
 * SN 搜索接口（自动补全）
 * 请求示例：
 *   /api/sn?keyword=R730
 */
router.get('/', snController.searchSn)

/**
 * GET /api/sn/:sn
 *
 * SN 详情查询接口
 * 请求示例：
 *   /api/sn/R730-001
 */
router.get('/:sn', snController.getSnDetail)

module.exports = router

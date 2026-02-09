// rotues/hwRoutes.js
/**
 * 硬件配置方案 - 后端 API 示例
 * 
 *
 *
 * 硬件查询模块路由层：
 *   - 只负责 URL → Controller 的映射
 *   - 不写任何业务逻辑、不写 SQL、不做权限判断
 *
 * 权限控制说明：
 *   - 硬件查询路由的 JWT 验证已在 server.js 中统一处理：
 *       app.use("/api/hardware", authMiddleware, hwRouter)
 *   - 所以本文件无需再引入 authMiddleware，避免重复鉴权
 */

const express = require('express')
const router = express.Router()

const hwController = require('../controllers/hwController')

/**
 * GET /api/hw/cpu
 *
 * CPU 搜索接口（自动补全）
 * 请求示例：
 *   /api/hw/cpu?keyword=R730
 */
router.get('/', hwController.searchCpu)

/**
 * GET /api/hw/cpu/:id
 *
 * CPU 详情查询接口
 * 请求示例：
 *   /api/hw/cpu/R730-001
 */
router.get('/:id', hwController.getCpuDetail)

module.exports = router
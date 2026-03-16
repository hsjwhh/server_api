/**
 * routes/snRoutes.js
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
const { validateField } = require('../middleware/validate')

/**
 * GET /api/sn
 *
 * SN 搜索接口（自动补全）
 * 请求示例：
 *   /api/sn?keyword=R730
 */
router.get('/', validateField('query', 'keyword', { min: 4, required: true }), snController.searchSn)

/**
 * POST /api/sn
 *
 * 新增服务器信息
 */
router.post('/',
    validateField('body', 'sn', { min: 4, required: true }),
    snController.addServer
)

/**
 * GET /api/sn/cpu2mb/:cpu
 *
 * 根据 CPU 型型号查询对应主板型号（去重）
 * 请求示例：
 *   /api/sn/cpu2mb/E5-2620
 *
 * 注意：必须定义在 GET /：sn 之前，否则 Express 会先匹配通配路由
 */
router.get('/cpu2mb/:cpu', snController.getMbByCpu)

/**
 * GET /api/sn/:sn
 *
 * SN 详情查询接口（通配兼容，必须放在最后）
 * 请求示例：
 *   /api/sn/R730-001
 */
router.get('/:sn', snController.getSnDetail)

module.exports = router

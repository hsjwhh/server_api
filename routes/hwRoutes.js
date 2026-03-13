const express = require('express')
const router = express.Router()

const hwController = require('../controllers/hwController')
const { validateField } = require('../middleware/validate')

/**
 * [Gemini] 路由映射说明:
 * 此文件挂载在 server.js 的 /api/hw 下
 * 
 * 1. GET /api/hw/cpu  -> CPU 搜索 (型号模糊 + 核心数过滤)
 * 2. GET /api/hw/mb   -> 主板型号搜索
 * 3. GET /api/hw/cpu/:id -> CPU 详情
 * 4. GET /api/hw/mb/:socket -> 根据插槽查询主板
 */

// 1. CPU 搜索
router.get('/cpu',
    validateField('query', 'keyword', { min: 4, required: false }),
    validateField('query', 'cores', { max: 3, required: false }),
    hwController.searchCpu
)

// 2. 主板型号搜索 (必须在 /mb/:socket 之前)
router.get('/mb',
    validateField('query', 'keyword', { min: 4, required: true }),
    hwController.searchMb
)

// 3. CPU 详情
router.get('/cpu/:id', hwController.getCpuDetail)

// 4. 根据插槽查询主板 (放在最后，防止干扰 /mb)
router.get('/mb/:socket', hwController.getMbBySocket)

module.exports = router

/**
 * routes/caseRoutes.js
 * 售后工单路由
 * 挂载于 server.js: app.use('/api/cases', authMiddleware, caseRouter)
 */

const express = require('express')
const router = express.Router()
const caseController = require('../controllers/caseController')
const requirePermission = require('../middleware/requirePermission')

// 查询工单列表
router.get('/', requirePermission('case:read'), caseController.listCases)

// 新建工单
router.post('/', requirePermission('case:write'), caseController.createCase)

// 工单详情
router.get('/:id', requirePermission('case:read'), caseController.getCaseDetail)

// 更新工单（填写解决方案、变更状态、指派处理人）
router.put('/:id', requirePermission('case:write'), caseController.updateCase)

module.exports = router

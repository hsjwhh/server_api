/**
 * controllers/caseController.js
 * 售后工单控制器
 */

const caseService = require('../services/caseService')
const { encodeId, decodeId } = require('../utils/obfuscate')

// 格式化单条工单，混淆 id
function formatCase(c) {
  if (!c) return null
  return {
    ...c,
    id: encodeId(c.id),
    server_id: encodeId(c.server_id),
    handler_id: c.handler_id ? encodeId(c.handler_id) : null
  }
}

// 新建工单
exports.createCase = async (req, res, next) => {
  try {
    const { server_id, reporter_contact, issue_type, description } = req.body

    if (!server_id || !description) {
      return res.status(400).json({
        code: 'VALIDATION_REQUIRED',
        message: 'server_id 和 description 为必填项'
      })
    }

    const serverId = decodeId(server_id)
    if (!serverId) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的 server_id' })
    }

    const newCase = await caseService.createCase({
      serverId,
      reporterContact: reporter_contact,
      issueType: issue_type,
      description,
      createdBy: req.user.id
    })

    res.status(201).json(formatCase(newCase))
  } catch (err) {
    next(err)
  }
}

// 查询工单列表
exports.listCases = async (req, res, next) => {
  try {
    const { status, sn, server_id, page, limit } = req.query

    let serverId
    if (server_id) {
      serverId = decodeId(server_id)
      if (!serverId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的 server_id' })
      }
    }

    const result = await caseService.getCases({ status, sn, serverId, page, limit })

    res.json({
      ...result,
      list: result.list.map(formatCase)
    })
  } catch (err) {
    next(err)
  }
}

// 获取工单详情
exports.getCaseDetail = async (req, res, next) => {
  try {
    const id = decodeId(req.params.id)
    if (!id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的工单 ID' })
    }

    const c = await caseService.getCaseById(id)
    if (!c) {
      return res.status(404).json({ code: 'CASE_NOT_FOUND', message: '工单不存在' })
    }

    res.json(formatCase(c))
  } catch (err) {
    next(err)
  }
}

// 更新工单
exports.updateCase = async (req, res, next) => {
  try {
    const id = decodeId(req.params.id)
    if (!id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的工单 ID' })
    }

    const { solution, status, handler_id } = req.body

    // status 枚举校验
    const validStatuses = ['open', 'processing', 'resolved', 'closed']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: `status 只能为 ${validStatuses.join(' / ')}`
      })
    }

    let handlerId
    if (handler_id !== undefined) {
      handlerId = handler_id ? decodeId(handler_id) : null
    }

    const updated = await caseService.updateCase(id, { solution, status, handlerId })
    if (!updated) {
      return res.status(404).json({ code: 'CASE_NOT_FOUND', message: '工单不存在' })
    }

    res.json(formatCase(updated))
  } catch (err) {
    next(err)
  }
}

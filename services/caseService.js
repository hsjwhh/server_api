/**
 * services/caseService.js
 * 售后工单业务逻辑层
 */

const { query } = require('../db')

/**
 * 生成工单号，格式：CASE-YYYYMMDD-XXXX
 * XXXX 为当天序号，自动补零到 4 位
 */
async function generateCaseNo() {
  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')

  const prefix = `CASE-${dateStr}-`

  const rows = await query(
    `SELECT case_no FROM support_cases WHERE case_no LIKE ? ORDER BY case_no DESC LIMIT 1`,
    [`${prefix}%`]
  )

  let seq = 1
  if (rows.length > 0) {
    const last = rows[0].case_no
    seq = parseInt(last.split('-').pop(), 10) + 1
  }

  return `${prefix}${String(seq).padStart(4, '0')}`
}

/**
 * 创建工单
 */
async function createCase(data) {
  const caseNo = await generateCaseNo()
  const { serverId, reporterContact, issueType, description, createdBy } = data

  const result = await query(
    `INSERT INTO support_cases
      (case_no, server_id, reporter_contact, issue_type, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [caseNo, serverId, reporterContact || null, issueType || null, description, createdBy]
  )

  const rows = await query(
    'SELECT * FROM support_cases WHERE id = ?',
    [result.insertId]
  )
  return rows[0]
}

/**
 * 查询工单列表（分页 + 筛选）
 * @param {object} filters - { status, sn, serverId, page, limit }
 */
async function getCases({ status, sn, serverId, page = 1, limit = 20 } = {}) {
  const conditions = []
  const params = []

  if (status) {
    conditions.push('sc.status = ?')
    params.push(status)
  }

  if (serverId) {
    conditions.push('sc.server_id = ?')
    params.push(serverId)
  } else if (sn) {
    conditions.push('si.sn = ?')
    params.push(sn)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const offset = (page - 1) * limit

  const [rows, countRows] = await Promise.all([
    query(
      `SELECT sc.*, si.sn, si.customer,
              u1.username AS created_by_name,
              u2.username AS handler_name
       FROM support_cases sc
       LEFT JOIN server_info si ON sc.server_id = si.id
       LEFT JOIN users u1 ON sc.created_by = u1.id
       LEFT JOIN users u2 ON sc.handler_id = u2.id
       ${where}
       ORDER BY sc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    ),
    query(
      `SELECT COUNT(*) AS total FROM support_cases sc
       LEFT JOIN server_info si ON sc.server_id = si.id
       ${where}`,
      params
    )
  ])

  return {
    total: countRows[0].total,
    page: Number(page),
    limit: Number(limit),
    list: rows
  }
}

/**
 * 根据 ID 获取工单详情
 */
async function getCaseById(id) {
  const rows = await query(
    `SELECT sc.*, si.sn, si.customer,
            u1.username AS created_by_name,
            u2.username AS handler_name
     FROM support_cases sc
     LEFT JOIN server_info si ON sc.server_id = si.id
     LEFT JOIN users u1 ON sc.created_by = u1.id
     LEFT JOIN users u2 ON sc.handler_id = u2.id
     WHERE sc.id = ?`,
    [id]
  )
  return rows[0] || null
}

/**
 * 更新工单（solution / status / handler_id）
 */
async function updateCase(id, data) {
  const fields = []
  const params = []

  if (data.solution !== undefined) {
    fields.push('solution = ?')
    params.push(data.solution)
  }
  if (data.status) {
    fields.push('status = ?')
    params.push(data.status)
  }
  if (data.handlerId !== undefined) {
    fields.push('handler_id = ?')
    params.push(data.handlerId || null)
  }

  if (fields.length === 0) return null

  await query(
    `UPDATE support_cases SET ${fields.join(', ')} WHERE id = ?`,
    [...params, id]
  )

  return getCaseById(id)
}

module.exports = {
  createCase,
  getCases,
  getCaseById,
  updateCase
}

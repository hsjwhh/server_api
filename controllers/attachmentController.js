/**
 * controllers/attachmentController.js
 */

const attachmentService = require('../services/attachmentService')
const { decodeId, encodeId } = require('../utils/obfuscate')

/**
 * POST /api/attachments/upload
 * 接收文件，上传到 MinIO，存库
 * Content-Type: multipart/form-data
 * 字段：file（文件）、entity_type（可选）、entity_id（可选，混淆值）
 */
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 'VALIDATION_REQUIRED', message: '未收到文件' })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: `文件类型不支持，允许：${allowedTypes.join(', ')}`
      })
    }

    // 限制 10MB
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '文件大小不能超过 10MB' })
    }

    const { entity_type, entity_id } = req.body

    let entityId = null
    if (entity_id) {
      entityId = decodeId(entity_id)
      if (!entityId) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的 entity_id' })
      }
    }

    // 上传到 MinIO
    const { objectKey, bucket, size } = await attachmentService.uploadToMinio(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    )

    // 存库
    const attachment = await attachmentService.saveAttachment({
      objectKey,
      bucket,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size,
      entityType: entity_type || null,
      entityId,
      createdBy: req.user.id
    })

    res.status(201).json({
      id: encodeId(attachment.id),
      objectKey: attachment.object_key,
      originalName: attachment.original_name,
      mimeType: attachment.mime_type,
      size: attachment.size,
      createdAt: attachment.created_at
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/attachments/img/*
 * 代理读取 MinIO 文件流，返回给前端
 * 路径示例：/api/attachments/img/images/2026/04/01/xxx.jpg
 */
exports.serveAttachment = async (req, res, next) => {
  try {
    // 从路径中提取 object_key（去掉 /api/attachments/img/ 前缀）
    const objectKey = req.params[0]

    if (!objectKey) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '缺少文件路径' })
    }

    const { stream, contentType, contentLength } = await attachmentService.getFromMinio(objectKey)

    // 设置响应头
    if (contentType) res.setHeader('Content-Type', contentType)
    if (contentLength) res.setHeader('Content-Length', contentLength)

    // 缓存 1 天
    res.setHeader('Cache-Control', 'public, max-age=86400')

    // pipe 流到响应
    stream.pipe(res)

  } catch (err) {
    // MinIO 找不到文件
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '文件不存在' })
    }
    next(err)
  }
}

/**
 * GET /api/attachments?entity_type=server&entity_id=xxx
 * 查询某业务实体的附件列表
 */
exports.listAttachments = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query

    if (!entity_type || !entity_id) {
      return res.status(400).json({
        code: 'VALIDATION_REQUIRED',
        message: 'entity_type 和 entity_id 为必填项'
      })
    }

    const entityId = decodeId(entity_id)
    if (!entityId) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '无效的 entity_id' })
    }

    const list = await attachmentService.getAttachments({ entityType: entity_type, entityId })

    res.json(list.map(a => ({
      id: encodeId(a.id),
      objectKey: a.object_key,
      originalName: a.original_name,
      mimeType: a.mime_type,
      size: a.size,
      createdAt: a.created_at,
      // 前端用这个路径请求图片
      imgPath: `/api/attachments/img/${a.object_key}`
    })))
  } catch (err) {
    next(err)
  }
}

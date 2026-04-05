/**
 * controllers/attachmentController.js
 */

const attachmentService = require('../services/attachmentService')
const { decodeId, encodeId } = require('../utils/obfuscate')
const sharp = require('sharp')

function normalizeUploadedFilename(filename) {
  if (!filename) {
    return filename
  }

  // Node.js/Multer 规范：Header 默认被解析为 latin1。
  // 通过 Buffer 将错认的 latin1 二进制流强行重铸为 utf8，彻底修复中文乱码。
  // 纯英文/数字名称在此转换下完全无损。
  return Buffer.from(filename, 'latin1').toString('utf8')
}

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

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      'application/pdf'
    ]
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

    const originalName = normalizeUploadedFilename(req.file.originalname)

    // 上传到 MinIO
    const { objectKey, bucket, size, mimeType: storedMimeType } = await attachmentService.uploadToMinio(
      req.file.buffer,
      req.file.mimetype,
      originalName
    )

    // 存库
    const attachment = await attachmentService.saveAttachment({
      objectKey,
      bucket,
      originalName,
      mimeType: storedMimeType,
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
    // 兼容 Express 5 命名通配符、旧版 unnamed splat 以及不同实现下的 string/array 形态。
    const rawObjectKey = req.params.path ?? req.params[0]
    let objectKey = Array.isArray(rawObjectKey) ? rawObjectKey.join('/') : rawObjectKey

    if (typeof objectKey === 'string') {
      objectKey = objectKey.replace(/^\/+/, '')
    }

    if (!objectKey) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '缺少文件路径' })
    }

    const { stream, contentType, contentLength } = await attachmentService.getFromMinio(objectKey)

    // 1. 解析缩放参数
    let w = parseInt(req.query.w, 10)
    let h = parseInt(req.query.h, 10)

    // 2. 安全防护：强制限制最大宽高为 800，防止恶意参数引发 OOM
    const MAX_DIMENSION = 800
    if (!isNaN(w)) w = Math.min(w, MAX_DIMENSION)
    if (!isNaN(h)) h = Math.min(h, MAX_DIMENSION)

    const isImage = contentType && contentType.startsWith('image/')
    const needsResize = (!isNaN(w) || !isNaN(h)) && isImage

    // 3. 通用响应头
    if (contentType) res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    // 4. 管道分发
    if (needsResize) {
      // 动态缩略图模式（由于体积改变，不返回 Content-Length，Express 自动使用 chunked）
      const transform = sharp().resize({
        width: isNaN(w) ? undefined : w,
        height: isNaN(h) ? undefined : h,
        fit: 'inside',
        withoutEnlargement: true
      })

      transform.on('error', (err) => {
        console.error('[attachment] sharp resize error:', err)
        if (!res.headersSent) res.status(500).end()
      })

      stream.pipe(transform).pipe(res)
    } else {
      // 原图或非图片模式：原样输出
      if (contentLength) res.setHeader('Content-Length', contentLength)
      stream.pipe(res)
    }

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

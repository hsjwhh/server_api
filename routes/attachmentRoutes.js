/**
 * routes/attachmentRoutes.js
 * 挂载于 server.js: app.use('/api/attachments', authMiddleware, attachmentRouter)
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const attachmentController = require('../controllers/attachmentController')
const requirePermission = require('../middleware/requirePermission')

// multer 内存模式（不落磁盘）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }  // 10MB 硬限制
})

// 上传文件
router.post(
  '/upload',
  requirePermission('attachment:upload'),
  upload.single('file'),
  attachmentController.uploadAttachment
)

// 代理读取图片（通配路径匹配 object_key）
router.get('/img/*', attachmentController.serveAttachment)

// 查询附件列表
router.get('/', requirePermission('attachment:read'), attachmentController.listAttachments)

module.exports = router

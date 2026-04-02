/**
 * services/attachmentService.js
 * MinIO 附件服务：上传、读取、数据库记录
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { randomUUID } = require('crypto')
const { query } = require('../db')
const config = require('../config')

// 初始化 S3 客户端（单例，指向内网 MinIO）
const s3 = new S3Client({
  region: config.minio.region,
  endpoint: config.minio.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey
  }
})

/**
 * 根据 MIME 类型推断文件扩展名
 */
function getExtFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
    'application/pdf': 'pdf'
  }
  return map[mimeType] || 'bin'
}

/**
 * 生成对象路径：images/YYYY/MM/DD/<uuid>.<ext>
 */
function generateObjectKey(mimeType) {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const uuid = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const ext = getExtFromMime(mimeType)
  return `images/${yyyy}/${mm}/${dd}/${uuid}.${ext}`
}

/**
 * 上传文件到 MinIO
 * @param {Buffer} fileBuffer - 文件内容
 * @param {string} mimeType - MIME 类型
 * @param {string} originalName - 原始文件名
 * @returns {{ objectKey, bucket, size }}
 */
async function uploadToMinio(fileBuffer, mimeType, originalName) {
  const objectKey = generateObjectKey(mimeType)
  const bucket = config.minio.bucket

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: fileBuffer,
    ContentType: mimeType
  }))

  return { objectKey, bucket, size: fileBuffer.length }
}

/**
 * 从 MinIO 获取文件流
 * @param {string} objectKey
 * @returns {{ stream, contentType, contentLength }}
 */
async function getFromMinio(objectKey) {
  const bucket = config.minio.bucket

  const response = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: objectKey
  }))

  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength
  }
}

/**
 * 记录附件信息到数据库
 */
async function saveAttachment({ objectKey, bucket, originalName, mimeType, size, entityType, entityId, createdBy }) {
  const result = await query(
    `INSERT INTO attachments
      (object_key, bucket, original_name, mime_type, size, entity_type, entity_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [objectKey, bucket, originalName || null, mimeType || null, size || null, entityType || null, entityId || null, createdBy]
  )
  const rows = await query('SELECT * FROM attachments WHERE id = ?', [result.insertId])
  return rows[0]
}

/**
 * 查询某业务实体的所有附件
 */
async function getAttachments({ entityType, entityId }) {
  return await query(
    'SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
    [entityType, entityId]
  )
}

module.exports = {
  uploadToMinio,
  getFromMinio,
  saveAttachment,
  getAttachments
}

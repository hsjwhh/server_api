/**
 * services/attachmentService.js
 * MinIO 附件服务：上传、读取、数据库记录
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { randomUUID } = require('crypto')
const sharp = require('sharp')
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
 * 尝试将图片转换为 WebP 格式
 * 只有当转换后的体积更小时才使用 WebP
 */
async function tryConvertToWebp(buffer, mimeType) {
  // webp 直接跳过
  if (mimeType === 'image/webp') {
    return { buffer, mimeType, converted: false }
  }

  try {
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer()

    // 对比大小，只有转换后更小才使用
    if (webpBuffer.length < buffer.length) {
      return { buffer: webpBuffer, mimeType: 'image/webp', converted: true }
    }
  } catch (err) {
    // 转换失败（如不支持的格式或非图片），静默回退原文件
    console.warn('[attachment] WebP 转换失败，使用原文件:', err.message)
  }

  return { buffer, mimeType, converted: false }
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
  // 尝试 WebP 转换并对比大小
  const { buffer: finalBuffer, mimeType: finalMimeType } = await tryConvertToWebp(fileBuffer, mimeType)

  // 注意：这里的扩展名会根据 finalMimeType 自动推导为 .webp（如果转换成功）
  const objectKey = generateObjectKey(finalMimeType)
  const bucket = config.minio.bucket

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: finalBuffer,
    ContentType: finalMimeType
  }))

  return { objectKey, bucket, size: finalBuffer.length }
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

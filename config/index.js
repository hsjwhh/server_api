const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// 所有环境变量都以项目根目录为基准查找，避免从不同工作目录启动时出现路径偏移。
const projectRoot = path.resolve(__dirname, '..')
const envFile = path.join(projectRoot, '.env')
const envLocalFile = path.join(projectRoot, '.env.local')

// 启动阶段优先完成环境变量注入，后面的配置解析函数只处理 `process.env`。
loadEnvFiles()

// 先解析基础环境，再推导出依赖它们的默认值。
// 例如生产环境默认启用安全 Cookie，本地开发默认关闭。
const nodeEnv = getString('NODE_ENV', 'development', { allowedValues: ['development', 'test', 'production'] })
const frontendUrl = getUrl('FRONTEND_URL', 'http://localhost:5173')
const corsOrigins = getUrlList('CORS_ORIGINS', [frontendUrl])
const cookieSecureDefault = nodeEnv === 'production'

// 对外只暴露结构化配置对象。
// 业务层统一读取这里，避免在各文件散落 `process.env.xxx`。
const config = {
  app: {
    nodeEnv,
    port: getNumber('PORT', 3000),
    frontendUrl,
    hashidsSalt: getString('HASHIDS_SALT', 'default-salt-please-change-it')
  },
  auth: {
    jwtSecret: getRequired('JWT_SECRET'),
    jwtExpiresIn: getString('JWT_EXPIRES_IN', '15m'),
    jwtRefreshSecret: getRequired('JWT_REFRESH_SECRET'),
    jwtRefreshExpiresIn: getString('JWT_REFRESH_EXPIRES_IN', '7d')
  },
  cookie: {
    secure: getBoolean('COOKIE_SECURE', cookieSecureDefault),
    sameSite: getString('COOKIE_SAME_SITE', 'Lax', { allowedValues: ['Strict', 'Lax', 'None'] }),
    maxAge: getNumber('COOKIE_MAX_AGE_MS', 7 * 24 * 60 * 60 * 1000),
    domain: getOptionalString('COOKIE_DOMAIN')
  },
  cors: {
    origins: corsOrigins
  },
  db: {
    host: getRequired('DB_HOST'),
    port: getNumber('DB_PORT', 3306),
    user: getRequired('DB_USER'),
    password: getRequired('DB_PASSWORD'),
    database: getRequired('DB_NAME'),
    waitForConnections: true,
    queueLimit: getNumber('DB_QUEUE_LIMIT', 0)
  }
}

// 冻结配置对象，防止运行时被误修改，保持“配置只读”约束。
module.exports = Object.freeze(config)

function loadEnvFiles() {
  // 先记录进程启动前就已经存在的环境变量。
  // 部署系统注入的变量优先级应高于本地 `.env` 文件，不能被覆盖。
  const initialEnvKeys = new Set(Object.keys(process.env))

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile })
  }

  if (fs.existsSync(envLocalFile)) {
    // `.env.local` 用于本机覆盖，但依然不能覆盖外部显式注入的环境变量。
    const parsed = dotenv.parse(fs.readFileSync(envLocalFile))
    for (const [key, value] of Object.entries(parsed)) {
      if (!initialEnvKeys.has(key)) {
        process.env[key] = value
      }
    }
  }
}

function getRequired(name) {
  // 必填项缺失直接在启动阶段失败，避免等请求进来后才暴露配置问题。
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getString(name, defaultValue, options = {}) {
  const value = process.env[name] ?? defaultValue

  // 对枚举类配置做白名单校验，避免拼写错误悄悄进入运行期。
  if (options.allowedValues && !options.allowedValues.includes(value)) {
    throw new Error(`Invalid value for ${name}. Expected one of: ${options.allowedValues.join(', ')}`)
  }
  return value
}

function getOptionalString(name) {
  const value = process.env[name]
  return value ? value : undefined
}

function getNumber(name, defaultValue) {
  const rawValue = process.env[name]
  if (rawValue === undefined || rawValue === '') {
    return defaultValue
  }

  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    // 数字型配置必须在启动时被拒绝，避免 MySQL 端口、服务端口等值带着错误运行。
    throw new Error(`Invalid numeric value for ${name}: ${rawValue}`)
  }

  return value
}

function getBoolean(name, defaultValue) {
  const rawValue = process.env[name]
  if (rawValue === undefined || rawValue === '') {
    return defaultValue
  }

  if (rawValue === 'true') {
    return true
  }

  if (rawValue === 'false') {
    return false
  }

  throw new Error(`Invalid boolean value for ${name}: ${rawValue}`)
}

function getUrl(name, defaultValue) {
  const value = process.env[name] ?? defaultValue

  try {
    // 统一去掉结尾 `/`，避免同一个地址因格式不同导致跨域白名单判断不一致。
    return new URL(value).toString().replace(/\/$/, '')
  } catch (error) {
    throw new Error(`Invalid URL value for ${name}: ${value}`)
  }
}

function getUrlList(name, defaultValue) {
  const rawValue = process.env[name]
  if (rawValue === undefined || rawValue === '') {
    return defaultValue
  }

  // 允许通过逗号分隔配置多个前端来源，兼容本地、测试、生产多域名场景。
  const values = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (values.length === 0) {
    throw new Error(`Invalid list value for ${name}: ${rawValue}`)
  }

  return values.map((value) => {
    try {
      // 列表中的每个 URL 都单独校验，保证 CORS 白名单不会混入非法值。
      return new URL(value).toString().replace(/\/$/, '')
    } catch (error) {
      throw new Error(`Invalid URL entry for ${name}: ${value}`)
    }
  })
}

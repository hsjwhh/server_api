const express = require("express")
const cors = require("cors")
const cookieParser = require('cookie-parser')
// 应用入口只依赖统一配置对象，不再直接读取 `process.env`。
const config = require('./config')

// 中间件：JWT 鉴权
const authMiddleware = require('./middleware/authMiddleware')

// 路由：登录/刷新 token/登出
// 注意：你之前命名为 authRoutes.js，这里保持一致
const authRoutes = require('./routes/authRoutes')

// 路由：SN 查询（受保护）
const snRouter = require("./routes/snRoutes")

// 路由：硬件查询（受保护）
const hwRouter = require("./routes/hwRoutes")

// 全局路由错误信息
const { AppError } = require('./utils/errors')

// 创建 Express 应用实例
const app = express()

/**
 * 全局 CORS 配置
 * 这里改为读取配置中心维护的白名单数组：
 *   - 本地开发可配置一个或多个前端地址
 *   - 测试 / 生产可通过环境变量切换，无需改代码
 *   - 避免把 origin 写死在入口文件里
 */
app.use(cors({
  origin: config.cors.origins,
  credentials: true,  // 允许前端携带 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 解析 Cookie（必须在路由之前注册）
app.use(cookieParser())

/**
 * 解析 JSON 请求体
 * 例如：req.body = { username: 'xxx', password: 'yyy' }
 */
app.use(express.json())

/**
 * 登录相关路由（无需鉴权）
 * 
 * 最终路径：
 *   POST /api/auth/login
 *   POST /api/auth/refresh
 *   POST /api/auth/logout
 */
app.use('/api/auth', authRoutes)

/**
 * SN/HW 查询路由（需要登录）
 * 
 * 访问路径：
 *   GET /api/sn/xxxx
 *   GET /api/cpu/xxxx
 * 
 * authMiddleware 会验证 accessToken 是否有效
 * 验证通过后才会进入 snRouter
 */
app.use("/api/sn", authMiddleware, snRouter)
app.use("/api/hw", authMiddleware, hwRouter)

/* 全局错误处理中间件（必须放在所有路由之后）
作用：统一捕获后端抛出的所有错误，并返回结构化的 JSON 给前端 */
app.use((err, req, res, next) => {

  // 打印错误到后台控制台，方便开发调试
  // 包含 message、code、status、stack 等信息
  console.error('❌ Error:', err)

  // 如果错误是我们自定义的 AppError 或其子类（如 AuthError、ValidationError）
  // 说明这是“可预期的业务错误”，我们应该把错误信息原样返回给前端
  if (err instanceof AppError) {
    return res.status(err.status).json({
      // 自定义错误码（如 AUTH_USER_NOT_FOUND）
      code: err.code,
      // 错误信息（如 “用户不存在”）
      message: err.message
    })
  }

  // 如果不是 AppError（例如代码 bug、数据库异常、未捕获异常）
  // 说明这是“未知错误”，不能把内部细节暴露给前端
  // 所以返回一个通用的 500 错误
  res.status(500).json({
    code: 'SERVER_ERROR',        // 固定错误码
    message: '服务器内部错误'     // 给用户的友好提示
  })
})


/**
 * 启动 HTTP 服务
 * 端口从统一配置读取，确保端口默认值、类型转换、合法性校验都在一个地方完成。
 */
const PORT = config.app.port
const HOST = '127.0.0.1' // 监听本地 IPv4 地址

app.listen(PORT, HOST, () => {
  console.log(`\n====================================`)
  console.log(`  ✅ API running on port ${PORT}`)
  console.log(`====================================\n`)
})


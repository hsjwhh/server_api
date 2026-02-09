/**
 * server.js
 * 
 * 后端入口文件：
 *   - 加载环境变量
 *   - 初始化 Express 应用
 *   - 挂载全局中间件（CORS、JSON 解析）
 *   - 挂载路由（登录路由、受保护的 SN 路由）
 *   - 启动 HTTP 服务
 */

require('dotenv').config({ path: __dirname + '/.env' })  // 必须放在最顶部，确保后续代码能读取到环境变量

const express = require("express")
const cors = require("cors")

// 中间件：JWT 鉴权
const authMiddleware = require('./middleware/authMiddleware')

// 路由：登录/刷新 token/登出
// 注意：你之前命名为 authRoutes.js，这里保持一致
const authRoutes = require('./routes/authRoutes')

// 路由：SN 查询（受保护）
const snRouter = require("./routes/sn")

// 路由：硬件查询（受保护）
const hwRouter = require("./routes/hwRoutes")

// 全局路由错误信息
const { AppError } = require('./utils/errors')

// 创建 Express 应用实例
const app = express()

/**
 * 全局 CORS 配置
 * 允许所有来源访问（你当前前后端分离开发时是合理的）
 * 如果未来上线生产环境，建议改为指定域名
 */
app.use(cors({
    origin: '*',  // 允许所有域名访问
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // 允许的 HTTP 方法
    allowedHeaders: ['Content-Type', 'Authorization']  // 允许携带的请求头
}))

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
app.use("/api/hw/cpu", authMiddleware, hwRouter)

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
 */
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`\n====================================`)
    console.log(`  ✅ API running on port ${PORT}`)
    console.log(`====================================\n`)
})

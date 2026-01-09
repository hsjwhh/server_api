// 自定义基础错误类（所有业务错误继承它）
class AppError extends Error {
  constructor(message, status = 500, code = 'SERVER_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

// 401：认证失败
class AuthError extends AppError {
  constructor(message = '认证失败', code = 'AUTH_ERROR') {
    super(message, 401, code)
  }
}

// 400：参数错误
class ValidationError extends AppError {
  constructor(message = '参数错误', code = 'VALIDATION_ERROR') {
    super(message, 400, code)
  }
}

module.exports = {
  AppError,
  AuthError,
  ValidationError
}

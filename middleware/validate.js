/**
 * middleware/validate.js
 * 
 * 通用参数校验中间件
 * 用于在路由层对请求的 body, query, params 进行基础校验（如必填、长度限制等）。
 * 
 * [Gemini]
 */

const { ValidationError } = require('../utils/errors');

/**
 * 通用字段校验器
 * @param {string} source - 校验来源 ('body', 'query', 'params')
 * @param {string} field - 字段名
 * @param {object} options - 校验选项
 * @param {number} options.min - 最小长度
 * @param {number} options.max - 最大长度
 * @param {boolean} options.required - 是否必填
 */
const validateField = (source, field, { min = 0, max = Infinity, required = true } = {}) => {
  return (req, res, next) => {
    const value = req[source] ? req[source][field] : undefined;

    // 1. 必填项校验
    if (required && (value === undefined || value === null || String(value).trim() === '')) {
      return next(new ValidationError(`${field} 是必填项`, 'VALIDATION_REQUIRED'));
    }

    // 2. 如果非必填且没有传值，直接通过
    if (!required && (value === undefined || value === null || String(value).trim() === '')) {
      return next();
    }

    // 3. 字符串长度校验
    if (typeof value === 'string') {
      if (value.length < min) {
        return next(new ValidationError(`${field} 长度不能少于 ${min} 个字符`, 'VALIDATION_MIN_LENGTH'));
      }
      if (value.length > max) {
        return next(new ValidationError(`${field} 长度不能超过 ${max} 个字符`, 'VALIDATION_MAX_LENGTH'));
      }
    }

    next();
  };
};

module.exports = {
  validateField
};

// 兼容层：
// 现有业务代码里已经大量使用 `require('../config')` 或 `require('./config')`。
// 这里保留一个根级入口，把真实实现转发到 `config/index.js`，
// 这样可以在不大规模改 require 路径的前提下完成配置中心重构。
module.exports = require('./config/index')

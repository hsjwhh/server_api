const mysql = require("mysql2/promise"); // 直接引入 promise 版本
const config = require("../config");

// 使用统一配置模块创建连接池。
// 这样数据库账号、端口、库名都只在配置中心维护，避免再次出现源码硬编码凭据。
const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: config.db.waitForConnections,
    queueLimit: config.db.queueLimit
});

// 对外继续暴露统一的 query 方法，尽量不影响上层 service 的调用方式。
async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

module.exports = { query };

const mysql = require("mysql2/promise"); // 直接引入 promise 版本
const config = require("../config");

// ✅ 使用 config.js 创建连接池
const pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    queueLimit: 0
});

// 直接导出 pool，或者封装 query
async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

module.exports = { query };
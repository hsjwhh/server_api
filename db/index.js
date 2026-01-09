const mysql = require("mysql2");
const config = require("../config");

// ✅ 使用 config.js 创建连接池
const pool = mysql.createPool({
    ...config.db,
    waitForConnections: true,
    queueLimit: 0
});

// ✅ 封装 query
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

module.exports = {query};
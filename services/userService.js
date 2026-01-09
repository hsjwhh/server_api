/**
 * userService.js
 * -----------------------------------------
 * 用户相关的数据库查询逻辑（Service 层）
 * 说明：
 *   - 所有数据库访问必须统一使用 db.query()
 *   - 不处理密码校验、不生成 token
 *   - 只负责“数据访问”，保持单一职责
 * -----------------------------------------
 */

const { query } = require('../db');  // 使用你之前封装好的 query()

/**
 * 根据用户名查询用户信息
 * @param {string} username - 用户名
 * @returns {Promise<object|null>} - 返回用户对象或 null
 */
async function findUserByUsername(username) {
    const sql = `
        SELECT 
            id,
            username,
            password_hash,
            role,
            status
        FROM users
        WHERE username = ?
        LIMIT 1
    `;

    try {
        // query() 返回的是 results 数组
        const results = await query(sql, [username]);

        // 如果没有查到用户，返回 null
        if (results.length === 0) {
            return null;
        }

        // 返回第一条记录
        return results[0];

    } catch (err) {
        console.error('查询用户失败:', err);
        throw err; // 继续向上抛，让 controller 处理
    }
}

module.exports = {
    findUserByUsername
};
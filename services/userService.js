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
const bcrypt = require('bcryptjs');

/**
 * 获取所有用户列表
 * 排除敏感字段 password_hash
 */
async function getAllUsers() {
    const sql = `
        SELECT id, username, role, status, created_at
        FROM users
        ORDER BY id DESC
    `;
    return await query(sql);
}

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
        const results = await query(sql, [username]);
        if (results.length === 0) return null;
        return results[0];
    } catch (err) {
        console.error('查询用户失败:', err);
        throw err;
    }
}

/**
 * 创建新用户
 */
async function createUser(userData) {
    const { username, password, role = 'user', status = 1 } = userData;

    // 1. 密码加密
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. 插入数据库
    const sql = `
        INSERT INTO users (username, password_hash, role, status)
        VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [username, passwordHash, role, status]);

    // 3. 返回新用户信息（不含密码）
    const rows = await query('SELECT id, username, role, status FROM users WHERE id = ?', [result.insertId]);
    return rows[0];
}

/**
 * 更新用户信息
 * 支持部分更新
 */
async function updateUser(id, data) {
    const fields = [];
    const params = [];

    // 处理密码更新
    if (data.password) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);
        fields.push('password_hash = ?');
        params.push(passwordHash);
    }

    if (data.role) {
        fields.push('role = ?');
        params.push(data.role);
    }

    if (data.status !== undefined) {
        fields.push('status = ?');
        params.push(data.status);
    }

    if (fields.length === 0) return null;

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, [...params, id]);

    const rows = await query('SELECT id, username, role, status FROM users WHERE id = ?', [id]);
    return rows[0];
}

/**
 * 删除用户
 */
async function deleteUser(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
}

module.exports = {
    getAllUsers,
    findUserByUsername,
    createUser,
    updateUser,
    deleteUser
};
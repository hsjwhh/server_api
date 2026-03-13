const { query } = require("../db");

// 负责 SQL 查询
/**
 * 搜索 CPU
 * 支持动态组合查询：
 * 1. 只有 keyword -> 型号模糊搜索
 * 2. 只有 cores -> 核心数精确搜索
 * 3. 都有 -> 两个条件 AND 过滤
 * 
 * @param {string} keyword - CPU 简称关键词
 * @param {string|number} cores - 核心数
 */
exports.getCpuName = async (keyword, cores) => {
    let sql = "SELECT * FROM cpu_info WHERE 1=1";
    const params = [];

    // 1. 型号模糊搜索
    if (keyword) {
        sql += " AND cpu_short_name LIKE ?";
        params.push(`%${keyword}%`);
    }

    // 2. 核心数精确过滤
    if (cores) {
        sql += " AND cores = ?";
        params.push(cores);
    }

    // 默认按简称排序，限制返回 50 条（按核心数搜时可能较多）
    sql += " ORDER BY cpu_short_name ASC LIMIT 50";

    return await query(sql, params);
};

// ✅ 根据 CPU id 获取详情
exports.getCpuDetail = async (id) => {
    const rows = await query(
        "SELECT * FROM cpu_info WHERE id = ?",
        [id]
    );
    return rows[0] ?? null;
};

// ✅ 根据 CPU socket 获取主板列表
exports.getMbBySocket = async (socket) => {
    const rows = await query(
        "SELECT * FROM mb_info WHERE sockets = ? LIMIT 20",
        [socket]
    );
    return rows;
};

// ✅ 根据关键词模糊搜索主板型号
exports.getMbByName = async (keyword) => {
    const sql = "SELECT * FROM mb_info WHERE model LIKE ? ORDER BY model ASC LIMIT 20";
    return await query(sql, [`%${keyword}%`]);
};
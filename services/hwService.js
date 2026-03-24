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

// ✅ 根据 cpu_s_name 模糊搜索并返回唯一的 cpu_name 列表
exports.getCpuNamesBySName = async (keyword) => {
    const sql = "SELECT DISTINCT cpu_name FROM cpu_info WHERE cpu_s_name LIKE ? ORDER BY cpu_name ASC LIMIT 50";
    const rows = await query(sql, [`%${keyword}%`]);
    return rows.map(row => row.cpu_name);
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

// ✅ 根据主板 ID 获取详情
exports.getMbDetail = async (id) => {
    const rows = await query(
        "SELECT * FROM mb_info WHERE id = ?",
        [id]
    );
    return rows[0] ?? null;
};

/**
 * ================================
 * CPU 增改逻辑
 * ================================
 */

// 新增 CPU
exports.createCpu = async (data) => {
    const fields = [
        'cpu_s_name', 'cpu_short_name', 'cpu_name', 'release_date', 'cores',
        'max_turbo', 'base_freq', 'cache', 'tdp', 'memory_channels',
        'memory_speed', 'max_memory_speed', 'max_memory_capacity',
        'ecc_support', 'socket', 'pci', 'scalability'
    ];
    const activeFields = fields.filter(f => data[f] !== undefined);
    const sql = `INSERT INTO cpu_info (${activeFields.join(', ')}) VALUES (${activeFields.map(() => '?').join(', ')})`;
    const result = await query(sql, activeFields.map(f => data[f]));
    const rows = await query("SELECT * FROM cpu_info WHERE id = ?", [result.insertId]);
    return rows[0];
};

// 更新 CPU
exports.updateCpu = async (id, data) => {
    const fields = [
        'cpu_s_name', 'cpu_short_name', 'cpu_name', 'release_date', 'cores',
        'max_turbo', 'base_freq', 'cache', 'tdp', 'memory_channels',
        'memory_speed', 'max_memory_speed', 'max_memory_capacity',
        'ecc_support', 'socket', 'pci', 'scalability'
    ];
    const activeFields = fields.filter(f => data[f] !== undefined);
    if (activeFields.length === 0) return null;

    const sql = `UPDATE cpu_info SET ${activeFields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    await query(sql, [...activeFields.map(f => data[f]), id]);
    const rows = await query("SELECT * FROM cpu_info WHERE id = ?", [id]);
    return rows[0];
};

/**
 * ================================
 * 主板 增改逻辑
 * ================================
 */

// 新增主板
exports.createMb = async (data) => {
    const fields = [
        'url', 'model', 'product_collection', 'sockets', 'cpu_number',
        'max_tdp', 'memory_type', 'dimm_number', 'max_memory',
        'pcie_number', 'pcie_list', 'm2', 'input'
    ];
    const activeFields = fields.filter(f => data[f] !== undefined);
    const sql = `INSERT INTO mb_info (${activeFields.join(', ')}) VALUES (${activeFields.map(() => '?').join(', ')})`;
    const result = await query(sql, activeFields.map(f => data[f]));
    const rows = await query("SELECT * FROM mb_info WHERE id = ?", [result.insertId]);
    return rows[0];
};

// 更新主板
exports.updateMb = async (id, data) => {
    const fields = [
        'url', 'model', 'product_collection', 'sockets', 'cpu_number',
        'max_tdp', 'memory_type', 'dimm_number', 'max_memory',
        'pcie_number', 'pcie_list', 'm2', 'input'
    ];
    const activeFields = fields.filter(f => data[f] !== undefined);
    if (activeFields.length === 0) return null;

    const sql = `UPDATE mb_info SET ${activeFields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    await query(sql, [...activeFields.map(f => data[f]), id]);
    const rows = await query("SELECT * FROM mb_info WHERE id = ?", [id]);
    return rows[0];
};
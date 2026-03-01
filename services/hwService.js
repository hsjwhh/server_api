const { query } = require("../db");

// 负责 SQL 查询
// ✅ 搜索 CPU
exports.getCpuName = async (keyword) => {
    const rows = await query(
        "SELECT * FROM  cpu_info WHERE cpu_short_name LIKE ? LIMIT 20",
        [`%${keyword}%`]
    );
    // return rows.map(r => r.SN);
    return rows;
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
const { query } = require("../db");

// 负责 SQL 查询
// ✅ 搜索 SN
exports.search = async (keyword) => {
    const rows = await query(
        "SELECT owner,customer,y,m,d,sn FROM  server_info WHERE sn LIKE ? LIMIT 20",
        [`%${keyword}%`]
    );
    // return rows.map(r => r.SN);
    return rows;
};

// ✅ 根据 SN 获取详情
exports.getDetail = async (sn) => {
    const rows = await query(
        "SELECT * FROM server_info WHERE sn = ? LIMIT 1",
        [sn]
    );
    return rows[0] || null;
};

// 搜索 CPU 对应的主板型号（去重）
exports.getMbByCpu = async (cpu) => {
    const rows = await query(
        "SELECT DISTINCT `mb` FROM server_info WHERE cpu = ? LIMIT 20",
        [cpu]
    );
    return rows;
};

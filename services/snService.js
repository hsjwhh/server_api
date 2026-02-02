const { query } = require("../db");

// 负责 SQL 查询
// ✅ 搜索 SN
exports.search = async (keyword) => {
    const rows = await query(
        "SELECT `业务`,`出机客户`,`年份`,`月份`,`日期`,SN FROM  server_info WHERE SN LIKE ? LIMIT 20",
        [`%${keyword}%`]
    );
    // return rows.map(r => r.SN);
    return rows;
};

// ✅ 根据 SN 获取详情
exports.getDetail = async (sn) => {
    const rows = await query(
        "SELECT * FROM server_info WHERE SN = ? LIMIT 1",
        [sn]
    );
    return rows[0] || null;
};
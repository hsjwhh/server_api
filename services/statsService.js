const { query } = require("../db");

/**
 * 获取 Dashboard 汇总数据
 */
exports.getSummary = async () => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM server_info) as totalCount,
            (SELECT COUNT(*) FROM server_info WHERE DATE_FORMAT(entry_date, '%Y-%m') = ?) as monthlyCount,
            (SELECT COUNT(DISTINCT customer) FROM server_info) as customerCount,
            (SELECT COUNT(*) FROM server_info WHERE sn IS NULL OR sn = '') as pendingInfoCount
    `;
    
    const rows = await query(sql, [currentYearMonth]);
    return rows[0];
};

/**
 * 获取最近录入的服务器
 */
exports.getRecentServers = async (limit = 10) => {
    const sql = `
        SELECT sn, customer, cpu, DATE_FORMAT(entry_date, '%Y-%m-%d') as entry_date, y, m, d 
        FROM server_info 
        ORDER BY id DESC 
        LIMIT ?
    `;
    return await query(sql, [limit]);
};

/**
 * 获取操作系统分布统计
 */
exports.getOsDistribution = async () => {
    const sql = `
        SELECT os as name, COUNT(*) as count 
        FROM server_info 
        WHERE os IS NOT NULL AND os != ''
        GROUP BY os 
        ORDER BY count DESC
    `;
    return await query(sql);
};

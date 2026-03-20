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
        "SELECT *, DATE_FORMAT(entry_date, '%Y-%m-%d') as entry_date FROM server_info WHERE sn = ? LIMIT 1",
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

// ✅ 插入新的服务器信息 (智能兼容 entry_date 或 y,m,d 传参)
exports.create = async (data) => {
    const fields = [
        'y', 'm', 'd', 'entry_date', 'owner', 'agent', 'sn', 'customer', 'number', 'chassis', 'psu',
        'mb', 'bmcpwd', 'cpu', 'cpun', 'mem', 'memn', 'm2', 'm2n', 'ssd', 'ssdn',
        'hdd', 'hddn', 'raid', 'raidn', 'lan', 'lann', 'gpu', 'gpun', 'os', 'note'
    ];

    let date;
    if (data.entry_date) {
        // 1. 如果有 entry_date，优先使用
        date = new Date(data.entry_date);
    } else if (data.y && data.m && data.d) {
        // 2. 如果只有 y, m, d，自动合成
        date = new Date(`${data.y}-${data.m}-${data.d}`);
    } else {
        // 3. 保底：今天
        date = new Date();
    }
    
    // 确保数据双向同步，无论是哪种方式进来的日期，最终都填满这四个字段
    const enrichedData = {
        ...data,
        entry_date: date.toISOString().split('T')[0],
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate()
    };

    const activeFields = fields.filter(f => enrichedData[f] !== undefined);
    const sql = `INSERT INTO server_info (${activeFields.join(', ')}) VALUES (${activeFields.map(() => '?').join(', ')})`;
    
    const result = await query(sql, activeFields.map(f => enrichedData[f]));
    const rows = await query(
        "SELECT *, DATE_FORMAT(entry_date, '%Y-%m-%d') as entry_date FROM server_info WHERE id = ?", 
        [result.insertId]
    );
    return rows[0];
};

/**
 * 检查 SN 唯一性
 * @param {string} sn - 序列号
 * @returns {Promise<boolean>} - true 表示唯一(不存在), false 表示已存在
 */
exports.isSnUnique = async (sn) => {
    const rows = await query(
        "SELECT COUNT(*) as count FROM server_info WHERE sn = ?",
        [sn]
    );
    return rows[0].count === 0;
};

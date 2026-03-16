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

// ✅ 插入新的服务器信息 (不处理 mb_id, cpu_id)
exports.create = async (data) => {
    const fields = [
        'y', 'm', 'd', 'owner', 'agent', 'sn', 'customer', 'number', 'chassis', 'psu',
        'mb', 'bmcpwd', 'cpu', 'cpun', 'mem', 'memn', 'm2', 'm2n', 'ssd', 'ssdn',
        'hdd', 'hddn', 'raid', 'raidn', 'lan', 'lann', 'gpu', 'gpun', 'os', 'note'
    ];

    // 过滤掉不在 fields 中的键，并构建 SQL
    const activeFields = fields.filter(f => data[f] !== undefined);
    const placeholders = activeFields.map(() => '?').join(', ');
    const values = activeFields.map(f => data[f]);

    const sql = `INSERT INTO server_info (${activeFields.join(', ')}) VALUES (${placeholders})`;
    
    const result = await query(sql, values);
    
    // 返回插入后的完整对象 (包含数据库生成的 id)
    const insertId = result.insertId;
    const rows = await query("SELECT * FROM server_info WHERE id = ?", [insertId]);
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

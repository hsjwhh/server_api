const Hashids = require('hashids/cjs');
const config = require('../config');

// 使用配置中的 hashidsSalt
const hashids = new Hashids(
    config.app.hashidsSalt, 
    8
);

/**
 * 编码数字 ID 为混淆字符串
 * @param {number|string} id 
 * @returns {string}
 */
const encodeId = (id) => {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    return hashids.encode(numericId);
};

/**
 * 解码混淆字符串为数字 ID
 * @param {string} hash 
 * @returns {number|null}
 */
const decodeId = (hash) => {
    if (!hash) return null;
    const decoded = hashids.decode(hash);
    return decoded.length > 0 ? decoded[0] : null;
};

module.exports = {
    encodeId,
    decodeId
};

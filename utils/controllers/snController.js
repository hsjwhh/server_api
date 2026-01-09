/**
 * controllers/snController.js
 *
 * RESTful 风格说明：
 *   - 成功：直接返回数据对象
 *   - 失败：使用 HTTP 状态码表达错误
 *   - 不再返回 { code: 200, data: ... }
 */

const snService = require("../services/snService");

// SN 搜索（自动补全）
exports.searchSn = async (req, res) => {
    const keyword = req.query.keyword || "";

    // keyword 为空 → 返回空数组（前端自动补全需要）
    if (!keyword) return res.json([]);

    try {
        const list = await snService.search(keyword);
        res.json(list); // 直接返回数组
    } catch (err) {
        console.error("searchSn error:", err);
        res.status(500).json({ message: "服务器错误" });
    }
};

// SN 详情
exports.getSnDetail = async (req, res) => {
    const sn = req.params.sn;

    // 参数校验
    if (!sn) {
        return res.status(400).json({
            message: "SN is required"
        });
    }

    try {
        const data = await snService.getDetail(sn);

        // 未找到 SN
        if (!data) {
            return res.status(404).json({
                message: "SN 未找到"
            });
        }

        // 成功 → 直接返回 SN 数据对象
        res.json(data);

    } catch (err) {
        console.error("SN 查询错误：", err);
        res.status(500).json({
            message: "服务器错误"
        });
    }
};

// controllers/hwController.js
/**
 *
 * RESTful 风格说明：
 *   - 成功：直接返回数据对象
 *   - 失败：使用 HTTP 状态码表达错误
 *   - 不再返回 { code: 200, data: ... }
 */

const hwService = require("../services/hwService");

// CPU 搜索（自动补全）
exports.searchCpu = async (req, res) => {
    const keyword = req.query.keyword || "";

    // keyword 为空 → 返回空数组（前端自动补全需要）
    if (!keyword) return res.json([]);

    try {
        const list = await hwService.getCpuName(keyword);
        res.json(list); // 直接返回数组
    } catch (err) {
        console.error("searchCpu error:", err);
        res.status(500).json({ message: "服务器错误" });
    }
};

// CPU 详情
exports.getCpuDetail = async (req, res) => {
    const id = req.params.id; // URL 参数：/cpu/:id

    // 参数校验
    if (!id) {
        return res.status(400).json({
            message: "CPU id is required"
        });
    }

    try {
        const data = await hwService.getCpuDetail(id);

        // 未找到 CPU
        if (!data) {
            return res.status(404).json({
                message: "CPU 未找到"
            });
        }

        // 成功 → 直接返回 CPU 数据对象
        res.json(data);

    } catch (err) {
        console.error("CPU 查询错误：", err);
        res.status(500).json({
            message: "服务器错误"
        });
    }
};
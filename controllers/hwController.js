// controllers/hwController.js
/**
 *
 * RESTful 风格说明：
 *   - 成功：直接返回数据对象
 *   - 失败：使用 HTTP 状态码表达错误
 *   - 不再返回 { code: 200, data: ... }
 */

const hwService = require("../services/hwService");
const { encodeId, decodeId } = require("../utils/obfuscate");

// CPU 搜索（自动补全）
// 支持 ?keyword=xxx & cores=yyy
exports.searchCpu = async (req, res) => {
    // 获取关键词和核心数
    const { keyword, cores } = req.query;

    // 业务基础校验：不能查全表，必须至少提供 keyword 或 cores 之一
    if (!keyword && !cores) {
        return res.status(400).json({
            message: "请至少输入 CPU 型号关键词或核心数"
        });
    }

    try {
        // 调用 Service
        const list = await hwService.getCpuName(keyword, cores);

        // 如果结果集为空
        if (!list || list.length === 0) {
            return res.json([]);
        }

        // 对 ID 进行混淆处理
        const obfuscatedList = list.map(item => ({
            ...item,
            id: encodeId(item.id)
        }));

        res.json(obfuscatedList);

    } catch (err) {
        console.error("searchCpu error:", err);
        res.status(500).json({
            message: "服务器查询 CPU 列表失败"
        });
    }
};

// CPU 详情
exports.getCpuDetail = async (req, res) => {
    const hashId = req.params.id; // URL 参数：/cpu/:id

    // 参数校验
    if (!hashId) {
        return res.status(400).json({
            message: "CPU id is required"
        });
    }

    // 解码混淆 ID
    const id = decodeId(hashId);
    if (!id) {
        return res.status(400).json({
            message: "Invalid CPU id"
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

        // 对返回结果中的 ID 也要混淆（保持一致性）
        data.id = hashId;

        // 成功 → 直接返回 CPU 数据对象
        res.json(data);

    } catch (err) {
        console.error("CPU 查询错误：", err);
        res.status(500).json({
            message: "服务器错误"
        });
    }
};

// Motherboard 搜索
exports.getMbBySocket = async (req, res) => {
    const socket = req.params.socket; // URL 参数：/mb/:socket

    if (!socket) {
        return res.status(400).json({
            message: "Socket is required"
        });
    }

    try {
        const data = await hwService.getMbBySocket(socket);

        // 如果未查到结果，直接返回空数组
        if (!data || data.length === 0) {
            return res.json([]);
        }

        // 对 ID 进行混淆处理
        const obfuscatedList = data.map(item => ({
            ...item,
            id: encodeId(item.id)
        }));

        // 成功 → 返回数据对象
        res.json(obfuscatedList);

    } catch (err) {
        console.error("Motherboard 查询错误：", err);
        res.status(500).json({
            message: "服务器查询主板失败"
        });
    }
};

// 根据关键词模糊搜索主板型号
exports.searchMb = async (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({
            message: "请输入主板型号关键词"
        });
    }

    try {
        const list = await hwService.getMbByName(keyword);

        if (!list || list.length === 0) {
            return res.json([]);
        }

        // 对 ID 进行混淆处理
        const obfuscatedList = list.map(item => ({
            ...item,
            id: encodeId(item.id)
        }));

        res.json(obfuscatedList);

    } catch (err) {
        console.error("searchMb error:", err);
        res.status(500).json({
            message: "服务器查询主板型号失败"
        });
    }
};

/**
 * ================================
 * CPU 管理
 * ================================
 */

// 新增 CPU
exports.addCpu = async (req, res) => {
    try {
        const data = await hwService.createCpu(req.body);
        data.id = encodeId(data.id);
        res.status(201).json(data);
    } catch (err) {
        console.error("addCpu error:", err);
        res.status(500).json({ message: "服务器新增 CPU 失败" });
    }
};

// 更新 CPU
exports.updateCpu = async (req, res) => {
    const hashId = req.params.id;
    const id = decodeId(hashId);
    if (!id) return res.status(400).json({ message: "Invalid CPU id" });

    try {
        const data = await hwService.updateCpu(id, req.body);
        if (!data) return res.status(404).json({ message: "CPU 未找到" });
        data.id = hashId;
        res.json(data);
    } catch (err) {
        console.error("updateCpu error:", err);
        res.status(500).json({ message: "服务器更新 CPU 失败" });
    }
};

/**
 * ================================
 * 主板 管理
 * ================================
 */

// 新增主板
exports.addMb = async (req, res) => {
    try {
        const data = await hwService.createMb(req.body);
        data.id = encodeId(data.id);
        res.status(201).json(data);
    } catch (err) {
        console.error("addMb error:", err);
        res.status(500).json({ message: "服务器新增主板失败" });
    }
};

// 更新主板
exports.updateMb = async (req, res) => {
    const hashId = req.params.id;
    const id = decodeId(hashId);
    if (!id) return res.status(400).json({ message: "Invalid MB id" });

    try {
        const data = await hwService.updateMb(id, req.body);
        if (!data) return res.status(404).json({ message: "主板未找到" });
        data.id = hashId;
        res.json(data);
    } catch (err) {
        console.error("updateMb error:", err);
        res.status(500).json({ message: "服务器更新主板失败" });
    }
};

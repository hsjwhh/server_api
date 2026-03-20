const statsService = require("../services/statsService");

/**
 * 获取 Dashboard 综合统计数据
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. 获取各项基础数据 (并行执行提升效率)
        const [summary, recentServers, osDistributionRaw] = await Promise.all([
            statsService.getSummary(),
            statsService.getRecentServers(10),
            statsService.getOsDistribution()
        ]);

        // 2. 计算操作系统分布的百分比
        const totalServers = summary.totalCount || 1; // 避免除以 0
        
        const osDistribution = osDistributionRaw.map(item => ({
            name: item.name,
            count: item.count,
            percent: Math.round((item.count / totalServers) * 100)
        }));

        // 3. 组合最终响应
        res.json({
            summary: {
                totalCount: Number(summary.totalCount),
                monthlyCount: Number(summary.monthlyCount),
                customerCount: Number(summary.customerCount),
                pendingInfoCount: Number(summary.pendingInfoCount)
            },
            recentServers,
            osDistribution
        });

    } catch (err) {
        console.error("getDashboardStats error:", err);
        res.status(500).json({
            message: "获取 Dashboard 统计数据失败"
        });
    }
};

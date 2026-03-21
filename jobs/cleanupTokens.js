/**
 * jobs/cleanupTokens.js
 * 
 * 独立执行的定时任务脚本，用于清理数据库中所有过期的或已吊销的 Refresh Token。
 * 建议通过 crontab 或 CI/CD 流程定期执行。
 * 
 * 执行方式: node jobs/cleanupTokens.js
 */

const { query } = require('../db');

async function cleanup() {
    try {
        console.log('[cleanupTokens] 开始清理废弃 token...');
        
        const result = await query(
            'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = 1'
        );
        
        console.log(`[cleanupTokens] 已清理 ${result.affectedRows || 0} 条废弃 token`);
        process.exit(0);
    } catch (err) {
        console.error('[cleanupTokens] 清理过程中发生错误:', err);
        process.exit(1);
    }
}

cleanup();

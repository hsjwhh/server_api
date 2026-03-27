const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const requirePermission = require('../middleware/requirePermission');

/**
 * GET /api/stats/dashboard
 * 获取全动态 Dashboard 汇总数据
 */
router.get('/dashboard',
    requirePermission('dashboard:view'),
    statsController.getDashboardStats
);

module.exports = router;

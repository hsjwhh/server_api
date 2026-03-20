const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

/**
 * GET /api/stats/dashboard
 * 获取全动态 Dashboard 汇总数据
 */
router.get('/dashboard', statsController.getDashboardStats);

module.exports = router;

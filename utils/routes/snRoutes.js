const express = require('express');
const router = express.Router();
const snController = require('../controllers/snController');
const authMiddleware = require('../middleware/authMiddleware');

// SN 搜索
router.get('/', authMiddleware, snController.searchSn);

// SN 详情
router.get('/:sn', authMiddleware, snController.getSnDetail);

module.exports = router;
/**
 * routes/userRoutes.js
 *
 * 用户管理路由 (Admin Only)
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const requirePermission = require('../middleware/requirePermission');

// 应用 'user:manage' 权限守卫到所有路由
router.use(requirePermission('user:manage'));

// 1. 获取用户列表
router.get('/', userController.listUsers);

// 2. 创建用户
router.post('/', userController.addUser);

// 3. 修改用户信息 (使用混淆 ID)
router.put('/:id', userController.editUser);

// 4. 删除用户 (使用混淆 ID)
router.delete('/:id', userController.removeUser);

/**
 * 用户的 Session 管理 (Admin Only)
 */
// 5. 查看特定用户的活跃会话
router.get('/:id/sessions', userController.listUserSessions);

// 6. 强行踢掉特定用户的某个会话
router.delete('/:id/sessions/:sessionId', userController.revokeUserSession);

module.exports = router;

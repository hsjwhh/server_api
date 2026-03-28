/**
 * controllers/userController.js
 *
 * 用户管理控制器 (Admin Only)
 */

const userService = require('../services/userService');
const { encodeId, decodeId } = require('../utils/obfuscate');

// 获取所有用户
exports.listUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        
        // 混淆 ID
        const safeUsers = users.map(user => ({
            ...user,
            id: encodeId(user.id)
        }));
        
        res.json(safeUsers);
    } catch (err) {
        console.error('listUsers error:', err);
        res.status(500).json({ message: '获取用户列表失败' });
    }
};

// 创建用户
exports.addUser = async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    try {
        // 检查用户名是否已存在
        const existing = await userService.findUserByUsername(username);
        if (existing) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        const newUser = await userService.createUser({ username, password, role });
        newUser.id = encodeId(newUser.id);
        
        res.status(201).json(newUser);
    } catch (err) {
        console.error('addUser error:', err);
        res.status(500).json({ message: '创建用户失败' });
    }
};

// 更新用户
exports.editUser = async (req, res) => {
    const hashId = req.params.id;
    const id = decodeId(hashId);

    if (!id) {
        return res.status(400).json({ message: '无效的用户 ID' });
    }

    try {
        const updatedUser = await userService.updateUser(id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: '未找到该用户' });
        }

        updatedUser.id = hashId;
        res.json(updatedUser);
    } catch (err) {
        console.error('editUser error:', err);
        res.status(500).json({ message: '更新用户失败' });
    }
};

// 删除用户
exports.removeUser = async (req, res) => {
    const hashId = req.params.id;
    const id = decodeId(hashId);

    if (!id) {
        return res.status(400).json({ message: '无效的用户 ID' });
    }

    try {
        const success = await userService.deleteUser(id);
        if (!success) {
            return res.status(404).json({ message: '未找到该用户或删除失败' });
        }
        res.json({ message: '用户已成功删除' });
    } catch (err) {
        console.error('removeUser error:', err);
        res.status(500).json({ message: '删除用户失败' });
    }
};

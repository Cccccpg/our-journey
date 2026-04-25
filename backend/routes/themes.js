const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// 获取所有主题（公开）
router.get('/', (req, res) => {
  const themes = db.prepare('SELECT * FROM themes').all();
  res.json({ themes });
});

// 获取当前激活主题（公开）
router.get('/active', (req, res) => {
  const theme = db.prepare('SELECT * FROM themes WHERE is_active = 1').get();
  res.json({ theme });
});

// 设置激活主题（公开，不需要认证）
router.put('/active', (req, res) => {
  const { id } = req.body;

  // 先取消所有激活
  db.prepare('UPDATE themes SET is_active = 0').run();
  // 再激活指定主题
  db.prepare('UPDATE themes SET is_active = 1 WHERE id = ?').run(id);

  res.json({ success: true });
});

// 更新主题颜色（需认证）
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { primary_color, accent_color, dark_color, light_color } = req.body;

  db.prepare(`
    UPDATE themes SET primary_color = ?, accent_color = ?, dark_color = ?, light_color = ?
    WHERE id = ?
  `).run(primary_color, accent_color, dark_color, light_color, id);

  res.json({ success: true });
});

module.exports = router;
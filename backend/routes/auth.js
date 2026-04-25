const express = require('express');
const bcrypt = require('../utils/password');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'token和密码都必需' });
  }

  const tokenRow = db.prepare('SELECT * FROM edit_tokens WHERE token = ?').get(token);

  if (!tokenRow) {
    return res.status(401).json({ error: '无效的编辑链接' });
  }

  const match = bcrypt.compareSync(password, tokenRow.password_hash);

  if (!match) {
    return res.status(401).json({ error: '密码错误' });
  }

  const jwtToken = jwt.sign(
    { tokenId: tokenRow.id, token: token },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ success: true, jwt: jwtToken });
});

router.post('/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  const token = authHeader.split(' ')[1];

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false });
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match) return;
      const [, key, rawValue] = match;
      if (process.env[key]) return;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    });
}

const db = require('./db/database');

const placesRoutes = require('./routes/places');
const photosRoutes = require('./routes/photos');
const authRoutes = require('./routes/auth');
const themesRoutes = require('./routes/themes');
const journeysRoutes = require('./routes/journeys');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = 8080;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保照片目录存在
const photosDir = path.join(__dirname, '..', 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

// API 路由
app.use('/api/places', placesRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/journeys', journeysRoutes);
app.use('/api/ai', aiRoutes);

// 照片静态文件服务
app.use('/photos', express.static(photosDir));

// 前端静态文件服务（生产环境）
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`编辑链接: http://localhost:${PORT}/edit?token=travel2024love`);
  console.log(`编辑密码: 20230225`);
});

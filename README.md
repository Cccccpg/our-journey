# 我们的足迹

一个记录旅行足迹的 Web 应用，支持三级地图钻取（省-市-区县），可以添加足迹、照片和旅途故事。

## 功能特性

- 🗺️ 三级地图钻取：从全国到省、市、区县逐级深入
- 📍 足迹记录：添加旅行地点、时间、故事和照片
- ✈️ 旅途路线：记录不同交通方式的旅程，带动态动画效果
- 📱 移动端适配：响应式设计，手机端底部导航切换
- 🎨 多主题切换：浪漫玫瑰、清新薄荷、星空深邃、日落暖橙

## 技术栈

- 前端：Vue 3 + Vite + ECharts
- 后端：Express + SQLite (better-sqlite3)
- 地图：ECharts 中国地图 + 阿里云 DataV GeoJSON

## 本地开发

```bash
# 安装依赖
npm install
cd frontend && npm install
cd backend && npm install

# 启动后端
cd backend && node server.js

# 启动前端开发服务器
cd frontend && npm run dev
```

## 生产部署

```bash
# 构建前端
cd frontend && npm run build

# 使用 PM2 启动后端
pm2 start backend/server.js --name travel-backend

# Nginx 配置代理到后端 8080 端口
```

## 编辑模式

访问 `/edit?token=travel2024love` 进入编辑模式，密码为 `20230225`。
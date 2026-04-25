const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('../utils/password');

const dbPath = path.join(__dirname, 'travel.db');
const db = new Database(dbPath);

// 创建表结构（主题name加唯一约束）
db.exec(`
CREATE TABLE IF NOT EXISTS provinces (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    adcode TEXT,
    center_lon REAL,
    center_lat REAL,
    visited_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY,
    province_id INTEGER,
    name TEXT NOT NULL,
    city_adcode TEXT,
    district_name TEXT,
    district_adcode TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    visited_at TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (province_id) REFERENCES provinces(id)
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY,
    city_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_path TEXT NOT NULL,
    upload_at TEXT DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0,
    is_cover INTEGER DEFAULT 0,
    FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS edit_tokens (
    id INTEGER PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    dark_color TEXT NOT NULL,
    light_color TEXT NOT NULL,
    is_active INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS journeys (
    id INTEGER PRIMARY KEY,
    from_city_id INTEGER NOT NULL,
    to_city_id INTEGER NOT NULL,
    transport_type TEXT NOT NULL,
    transport_name TEXT,
    departure_time TEXT,
    arrival_time TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    photos TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_city_id) REFERENCES cities(id),
    FOREIGN KEY (to_city_id) REFERENCES cities(id)
);
`);

// 初始化中国省份数据（包含行政区划代码和中心坐标）
const provincesData = [
  { name: '北京', code: 'beijing', adcode: '110000', center: [116.4, 39.9] },
  { name: '天津', code: 'tianjin', adcode: '120000', center: [117.2, 39.1] },
  { name: '河北', code: 'hebei', adcode: '130000', center: [114.5, 38.0] },
  { name: '山西', code: 'shanxi', adcode: '140000', center: [112.5, 37.9] },
  { name: '内蒙古', code: 'neimenggu', adcode: '150000', center: [111.7, 41.8] },
  { name: '辽宁', code: 'liaoning', adcode: '210000', center: [123.4, 41.8] },
  { name: '吉林', code: 'jilin', adcode: '220000', center: [125.3, 43.9] },
  { name: '黑龙江', code: 'heilongjiang', adcode: '230000', center: [126.6, 45.8] },
  { name: '上海', code: 'shanghai', adcode: '310000', center: [121.5, 31.2] },
  { name: '江苏', code: 'jiangsu', adcode: '320000', center: [118.8, 32.1] },
  { name: '浙江', code: 'zhejiang', adcode: '330000', center: [120.2, 30.3] },
  { name: '安徽', code: 'anhui', adcode: '340000', center: [117.3, 31.9] },
  { name: '福建', code: 'fujian', adcode: '350000', center: [119.3, 26.1] },
  { name: '江西', code: 'jiangxi', adcode: '360000', center: [115.9, 28.7] },
  { name: '山东', code: 'shandong', adcode: '370000', center: [117.0, 36.7] },
  { name: '河南', code: 'henan', adcode: '410000', center: [113.7, 34.8] },
  { name: '湖北', code: 'hubei', adcode: '420000', center: [114.3, 30.6] },
  { name: '湖南', code: 'hunan', adcode: '430000', center: [113.0, 28.2] },
  { name: '广东', code: 'guangdong', adcode: '440000', center: [113.3, 23.1] },
  { name: '广西', code: 'guangxi', adcode: '450000', center: [108.3, 22.8] },
  { name: '海南', code: 'hainan', adcode: '460000', center: [110.4, 19.0] },
  { name: '重庆', code: 'chongqing', adcode: '500000', center: [106.5, 29.6] },
  { name: '四川', code: 'sichuan', adcode: '510000', center: [104.1, 30.7] },
  { name: '贵州', code: 'guizhou', adcode: '520000', center: [106.7, 26.6] },
  { name: '云南', code: 'yunnan', adcode: '530000', center: [102.7, 25.0] },
  { name: '西藏', code: 'xizang', adcode: '540000', center: [91.1, 29.6] },
  { name: '陕西', code: 'shaanxi', adcode: '610000', center: [108.9, 34.3] },
  { name: '甘肃', code: 'gansu', adcode: '620000', center: [103.8, 36.1] },
  { name: '青海', code: 'qinghai', adcode: '630000', center: [96.1, 35.6] },
  { name: '宁夏', code: 'ningxia', adcode: '640000', center: [106.3, 37.5] },
  { name: '新疆', code: 'xinjiang', adcode: '650000', center: [87.6, 43.8] },
  { name: '台湾', code: 'taiwan', adcode: '710000', center: [121.5, 25.0] },
  { name: '香港', code: 'hongkong', adcode: '810000', center: [114.2, 22.3] },
  { name: '澳门', code: 'macao', adcode: '820000', center: [113.5, 22.2] }
];

const insertProvince = db.prepare('INSERT OR IGNORE INTO provinces (name, code, adcode, center_lon, center_lat) VALUES (?, ?, ?, ?, ?)');
provincesData.forEach(p => insertProvince.run(p.name, p.code, p.adcode, p.center[0], p.center[1]));

// 初始化预设主题
const themesData = [
  { name: '浪漫玫瑰', primary: '#E8B4B8', accent: '#FF6B6B', dark: '#8B7355', light: '#F8F4E8', active: 1 },
  { name: '清新薄荷', primary: '#A8D8B9', accent: '#4A9B7C', dark: '#2C5F4D', light: '#F0F8F4', active: 0 },
  { name: '星空深邃', primary: '#4A5568', accent: '#667EEA', dark: '#2D3748', light: '#F7FAFC', active: 0 },
  { name: '日落暖橙', primary: '#F6AD55', accent: '#ED8936', dark: '#C05621', light: '#FFFAF0', active: 0 }
];

const insertTheme = db.prepare('INSERT OR IGNORE INTO themes (name, primary_color, accent_color, dark_color, light_color, is_active) VALUES (?, ?, ?, ?, ?, ?)');
themesData.forEach(t => insertTheme.run(t.name, t.primary, t.accent, t.dark, t.light, t.active));

// 初始化编辑token和密码
const cityColumns = db.prepare('PRAGMA table_info(cities)').all().map((column) => column.name);

if (!cityColumns.includes('city_adcode')) {
  db.exec('ALTER TABLE cities ADD COLUMN city_adcode TEXT');
}

if (!cityColumns.includes('district_name')) {
  db.exec('ALTER TABLE cities ADD COLUMN district_name TEXT');
}

if (!cityColumns.includes('district_adcode')) {
  db.exec('ALTER TABLE cities ADD COLUMN district_adcode TEXT');
}

const photoColumns = db.prepare('PRAGMA table_info(photos)').all().map((column) => column.name);

if (!photoColumns.includes('is_cover')) {
  db.exec('ALTER TABLE photos ADD COLUMN is_cover INTEGER DEFAULT 0');
}

const defaultToken = 'travel2024love';
const defaultPassword = '20230225';
const passwordHash = bcrypt.hashSync(defaultPassword, 10);

const insertToken = db.prepare('INSERT OR IGNORE INTO edit_tokens (token, password_hash) VALUES (?, ?)');
insertToken.run(defaultToken, passwordHash);

module.exports = db;

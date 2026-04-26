const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const geoCacheDir = path.join(__dirname, '..', 'cache', 'districts');

if (!fs.existsSync(geoCacheDir)) {
  fs.mkdirSync(geoCacheDir, { recursive: true });
}

function normalizeRegionName(name = '') {
  return String(name)
    .replace(/特别行政区/g, '')
    .replace(/壮族自治区|回族自治区|维吾尔自治区|自治区/g, '')
    .replace(/地区|盟|自治州/g, '')
    .replace(/省|市|区|县/g, '')
    .trim();
}

function firstAddressValue(address, keys) {
  for (const key of keys) {
    if (address?.[key]) return address[key];
  }
  return '';
}

// 获取所有省份和城市数据（公开）
router.get('/', (req, res) => {
  const provinces = db.prepare('SELECT id, name, code, adcode, center_lon, center_lat, visited_at, notes FROM provinces').all();
  const cities = db.prepare(`
    SELECT c.*, p.name as province_name, p.code as province_code, p.adcode as province_adcode
    FROM cities c
    LEFT JOIN provinces p ON c.province_id = p.id
  `).all();

  // 获取每个城市的照片数量
  const photoCounts = db.prepare('SELECT city_id, COUNT(*) as count FROM photos GROUP BY city_id').all();
  const photoCountMap = {};
  photoCounts.forEach(p => photoCountMap[p.city_id] = p.count);

  const citiesWithPhotos = cities.map(c => ({
    ...c,
    photo_count: photoCountMap[c.id] || 0
  }));

  res.json({ provinces, cities: citiesWithPhotos });
});

// 新增城市（需认证）
router.post('/cities', authMiddleware, (req, res) => {
  const {
    province_id,
    name,
    city_adcode,
    district_name,
    district_adcode,
    latitude,
    longitude,
    visited_at,
    description,
    tags
  } = req.body;

  if (!name || !latitude || !longitude || !visited_at) {
    return res.status(400).json({ error: '城市名称、坐标和日期必需' });
  }

  const result = db.prepare(`
    INSERT INTO cities (province_id, name, city_adcode, district_name, district_adcode, latitude, longitude, visited_at, description, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    province_id || null,
    name,
    city_adcode || null,
    district_name || null,
    district_adcode || null,
    latitude,
    longitude,
    visited_at,
    description || '',
    tags || ''
  );

  // 更新省份访问状态
  if (province_id) {
    db.prepare('UPDATE provinces SET visited_at = COALESCE(visited_at, ?) WHERE id = ?').run(visited_at, province_id);
  }

  res.json({ success: true, id: result.lastInsertRowid });
});

// 更新城市（需认证）
router.put('/cities/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const {
    name,
    city_adcode,
    district_name,
    district_adcode,
    latitude,
    longitude,
    visited_at,
    description,
    tags,
    province_id
  } = req.body;

  db.prepare(`
    UPDATE cities SET name = ?, city_adcode = ?, district_name = ?, district_adcode = ?, latitude = ?, longitude = ?, visited_at = ?, description = ?, tags = ?, province_id = ?
    WHERE id = ?
  `).run(
    name,
    city_adcode || null,
    district_name || null,
    district_adcode || null,
    latitude,
    longitude,
    visited_at,
    description,
    tags,
    province_id || null,
    id
  );

  res.json({ success: true });
});

// 删除城市（需认证）
router.delete('/cities/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  // 先删除关联照片
  db.prepare('DELETE FROM photos WHERE city_id = ?').run(id);
  db.prepare('DELETE FROM cities WHERE id = ?').run(id);

  res.json({ success: true });
});

// 获取单个城市详情（公开）
router.get('/cities/:id', (req, res) => {
  const { id } = req.params;

  const city = db.prepare(`
    SELECT c.*, p.name as province_name
    FROM cities c
    LEFT JOIN provinces p ON c.province_id = p.id
    WHERE c.id = ?
  `).get(id);

  if (!city) {
    return res.status(404).json({ error: '城市不存在' });
  }

  const photos = db.prepare('SELECT * FROM photos WHERE city_id = ? ORDER BY is_cover DESC, display_order ASC, id ASC').all(id);

  res.json({ city, photos });
});

router.get('/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'invalid coordinates' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'zh-CN,zh,en');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'our-journey/1.0 reverse-geocode',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'reverse geocode failed' });
    }

    const data = await response.json();
    const address = data.address || {};
    const countryCode = String(address.country_code || '').toUpperCase();
    const provinceRaw = firstAddressValue(address, ['state', 'province', 'region']);
    const cityRaw = firstAddressValue(address, ['city', 'town', 'municipality', 'village', 'county']);
    const districtRaw = firstAddressValue(address, ['city_district', 'district', 'county', 'borough', 'suburb', 'neighbourhood', 'quarter']);
    const detailRaw = firstAddressValue(address, ['road', 'pedestrian', 'footway', 'residential', 'amenity', 'tourism', 'building']);
    const placeName = detailRaw || districtRaw || cityRaw || data.name || data.display_name || '地图选点';

    const provinces = db.prepare('SELECT id, name, adcode FROM provinces').all();
    const matchedProvince = provinces.find((province) => {
      const source = normalizeRegionName(provinceRaw);
      const target = normalizeRegionName(province.name);
      return source && (source === target || source.includes(target) || target.includes(source));
    });

    res.json({
      country: address.country || '',
      country_code: countryCode,
      province: matchedProvince?.name || provinceRaw || address.country || '',
      province_id: matchedProvince?.id || null,
      province_adcode: matchedProvince?.adcode || '',
      city: normalizeRegionName(cityRaw || placeName),
      city_adcode: '',
      district: normalizeRegionName(districtRaw || detailRaw),
      district_adcode: '',
      name: normalizeRegionName(placeName),
      address: data.display_name || '',
      latitude: lat,
      longitude: lng
    });
  } catch (error) {
    res.status(502).json({ error: 'reverse geocode failed' });
  } finally {
    clearTimeout(timeout);
  }
});

router.get('/geo/cities/:adcode/districts', async (req, res) => {
  const { adcode } = req.params;

  if (!/^\d{6}$/.test(adcode)) {
    return res.status(400).json({ error: 'invalid adcode' });
  }

  const cachePath = path.join(geoCacheDir, `${adcode}.json`);

  try {
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return res.json(cached);
    }

    const response = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`);
    if (!response.ok) {
      return res.status(404).json({ error: 'district geojson not found' });
    }

    const geoJson = await response.json();
    fs.writeFileSync(cachePath, JSON.stringify(geoJson));
    return res.json(geoJson);
  } catch (error) {
    return res.status(500).json({ error: 'failed to load district geojson' });
  }
});

module.exports = router;

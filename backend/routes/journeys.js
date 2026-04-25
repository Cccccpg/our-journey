const express = require('express');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// 获取所有旅程（公开）
router.get('/', (req, res) => {
  const journeys = db.prepare(`
    SELECT
      j.*,
      c1.name as from_city_name,
      c1.latitude as from_lat,
      c1.longitude as from_lon,
      c1.province_id as from_province_id,
      p1.name as from_province_name,
      c2.name as to_city_name,
      c2.latitude as to_lat,
      c2.longitude as to_lon,
      c2.province_id as to_province_id,
      p2.name as to_province_name
    FROM journeys j
    LEFT JOIN cities c1 ON j.from_city_id = c1.id
    LEFT JOIN cities c2 ON j.to_city_id = c2.id
    LEFT JOIN provinces p1 ON c1.province_id = p1.id
    LEFT JOIN provinces p2 ON c2.province_id = p2.id
    ORDER BY j.departure_time DESC
  `).all();

  res.json({ journeys });
});

// 新增旅程（需认证）
router.post('/', authMiddleware, (req, res) => {
  const {
    from_city_id,
    to_city_id,
    transport_type,
    transport_name,
    departure_time,
    arrival_time,
    duration_minutes,
    notes,
    photos
  } = req.body;

  if (!from_city_id || !to_city_id || !transport_type) {
    return res.status(400).json({ error: '起点、终点和交通类型必需' });
  }

  if (from_city_id === to_city_id) {
    return res.status(400).json({ error: '起点和终点不能相同' });
  }

  const result = db.prepare(`
    INSERT INTO journeys (from_city_id, to_city_id, transport_type, transport_name, departure_time, arrival_time, duration_minutes, notes, photos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    from_city_id,
    to_city_id,
    transport_type,
    transport_name || '',
    departure_time || null,
    arrival_time || null,
    duration_minutes || null,
    notes || '',
    photos || ''
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

// 更新旅程（需认证）
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const {
    from_city_id,
    to_city_id,
    transport_type,
    transport_name,
    departure_time,
    arrival_time,
    duration_minutes,
    notes,
    photos
  } = req.body;

  db.prepare(`
    UPDATE journeys SET
      from_city_id = ?,
      to_city_id = ?,
      transport_type = ?,
      transport_name = ?,
      departure_time = ?,
      arrival_time = ?,
      duration_minutes = ?,
      notes = ?,
      photos = ?
    WHERE id = ?
  `).run(
    from_city_id,
    to_city_id,
    transport_type,
    transport_name || '',
    departure_time || null,
    arrival_time || null,
    duration_minutes || null,
    notes || '',
    photos || '',
    id
  );

  res.json({ success: true });
});

// 删除旅程（需认证）
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM journeys WHERE id = ?').run(id);
  res.json({ success: true });
});

// 获取单个旅程详情（公开）
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const journey = db.prepare(`
    SELECT
      j.*,
      c1.name as from_city_name,
      c1.latitude as from_lat,
      c1.longitude as from_lon,
      c1.province_id as from_province_id,
      p1.name as from_province_name,
      c2.name as to_city_name,
      c2.latitude as to_lat,
      c2.longitude as to_lon,
      c2.province_id as to_province_id,
      p2.name as to_province_name
    FROM journeys j
    LEFT JOIN cities c1 ON j.from_city_id = c1.id
    LEFT JOIN cities c2 ON j.to_city_id = c2.id
    LEFT JOIN provinces p1 ON c1.province_id = p1.id
    LEFT JOIN provinces p2 ON c2.province_id = p2.id
    WHERE j.id = ?
  `).get(id);

  if (!journey) {
    return res.status(404).json({ error: '旅程不存在' });
  }

  res.json({ journey });
});

module.exports = router;
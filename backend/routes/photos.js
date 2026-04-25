const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

function ensureCoverPhoto(cityId, preferredPhotoId = null) {
  const existingCover = db.prepare('SELECT id FROM photos WHERE city_id = ? AND is_cover = 1').get(cityId);
  if (existingCover) return;

  const fallbackPhoto = preferredPhotoId
    ? db.prepare('SELECT id FROM photos WHERE id = ? AND city_id = ?').get(preferredPhotoId, cityId)
    : db.prepare('SELECT id FROM photos WHERE city_id = ? ORDER BY display_order ASC, id ASC').get(cityId);

  if (fallbackPhoto) {
    db.prepare('UPDATE photos SET is_cover = 1 WHERE id = ?').run(fallbackPhoto.id);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const photosDir = path.join(__dirname, '..', '..', 'photos');
    cb(null, photosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png and webp files are supported'));
    }
  }
});

router.post('/', authMiddleware, upload.single('photo'), (req, res) => {
  const { city_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!city_id) {
    return res.status(400).json({ error: 'city_id is required' });
  }

  const filePath = `/photos/${req.file.filename}`;
  const nextOrder = db.prepare('SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM photos WHERE city_id = ?').get(city_id).next_order;
  const result = db.prepare(`
    INSERT INTO photos (city_id, filename, original_name, file_path, display_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(city_id, req.file.filename, req.file.originalname, filePath, nextOrder);

  ensureCoverPhoto(city_id, result.lastInsertRowid);

  res.json({ success: true, id: result.lastInsertRowid, path: filePath });
});

router.post('/batch', authMiddleware, upload.array('photos', 10), (req, res) => {
  const { city_id } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  if (!city_id) {
    return res.status(400).json({ error: 'city_id is required' });
  }

  const startOrder = db.prepare('SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM photos WHERE city_id = ?').get(city_id).next_order;

  const inserted = req.files.map((file, index) => {
    const filePath = `/photos/${file.filename}`;
    const result = db.prepare(`
      INSERT INTO photos (city_id, filename, original_name, file_path, display_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(city_id, file.filename, file.originalname, filePath, startOrder + index);
    return { id: result.lastInsertRowid, path: filePath };
  });

  if (inserted.length) {
    ensureCoverPhoto(city_id, inserted[0].id);
  }

  res.json({ success: true, photos: inserted });
});

router.put('/order', authMiddleware, (req, res) => {
  const { city_id, photo_ids } = req.body;

  if (!city_id || !Array.isArray(photo_ids)) {
    return res.status(400).json({ error: 'city_id and photo_ids are required' });
  }

  const updateOrder = db.transaction((ids) => {
    ids.forEach((photoId, index) => {
      db.prepare('UPDATE photos SET display_order = ? WHERE id = ? AND city_id = ?').run(index, photoId, city_id);
    });
  });

  updateOrder(photo_ids);
  ensureCoverPhoto(city_id);

  res.json({ success: true });
});

router.put('/:id/cover', authMiddleware, (req, res) => {
  const { id } = req.params;
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  db.prepare('UPDATE photos SET is_cover = 0 WHERE city_id = ?').run(photo.city_id);
  db.prepare('UPDATE photos SET is_cover = 1 WHERE id = ?').run(id);

  res.json({ success: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);

  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  const filePath = path.join(__dirname, '..', '..', 'photos', photo.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  if (photo.is_cover) {
    ensureCoverPhoto(photo.city_id);
  }

  res.json({ success: true });
});

module.exports = router;

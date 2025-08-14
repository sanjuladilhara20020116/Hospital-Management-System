// routes/packageRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Package = require('../models/Package');

const router = express.Router();

// ensure uploads dir exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'packages');
fs.mkdirSync(uploadDir, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_').slice(0,40);
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({ storage });

// TODO: replace with real auth
function isManager(_req, _res, next) { return next(); }

// helper: parse tests from either JSON array or newline text
function parseTests(body) {
  if (Array.isArray(body.tests)) {
    return body.tests.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof body.tests === 'string') {
    // allow comma-separated
    return body.tests.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  }
  if (typeof body.testsText === 'string') {
    return body.testsText.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// GET /api/packages
router.get('/', async (_req, res) => {
  try {
    const list = await Package.find().sort({ createdAt: -1 });
    res.json(list);
  } catch {
    res.status(500).json({ message: 'Failed to load packages' });
  }
});

// GET /api/packages/:id
router.get('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    res.json(pkg);
  } catch (e) {
    res.status(400).json({ message: e.message || 'Failed to load package' });
  }
});

// POST /api/packages  (multipart/form-data with optional photo)
router.post('/', isManager, upload.single('photo'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const price = Number(req.body.price);
    const tests = parseTests(req.body);
    if (!name || Number.isNaN(price) || price < 0 || tests.length === 0) {
      return res.status(400).json({ message: 'Name, valid price, and at least one test are required' });
    }
    const photo = req.file ? `/uploads/packages/${req.file.filename}` : undefined;
    const pkg = await Package.create({ name, price, tests, photo });
    res.status(201).json({ message: 'Package created', package: pkg });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Create failed' });
  }
});

// PUT /api/packages/:id  (multipart/form-data with optional new photo)
router.put('/:id', isManager, upload.single('photo'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.price !== undefined) {
      const p = Number(req.body.price);
      if (Number.isNaN(p) || p < 0) return res.status(400).json({ message: 'Price must be non-negative' });
      updates.price = p;
    }
    if (req.body.tests !== undefined || req.body.testsText !== undefined) {
      const t = parseTests(req.body);
      if (!t.length) return res.status(400).json({ message: 'At least one test required' });
      updates.tests = t;
    }
    if (req.file) {
      updates.photo = `/uploads/packages/${req.file.filename}`;
    }

    const updated = await Package.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Package not found' });
    res.json({ message: 'Package updated', package: updated });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Update failed' });
  }
});

// DELETE /api/packages/:id
router.delete('/:id', isManager, async (req, res) => {
  try {
    const del = await Package.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'Package not found' });
    // (optional) delete file from disk
    // if (del.photo) { try { fs.unlinkSync(path.join(__dirname, '..', del.photo)); } catch {} }
    res.json({ message: 'Package deleted' });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Delete failed' });
  }
});

module.exports = router;

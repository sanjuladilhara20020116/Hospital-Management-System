const mongoose = require('mongoose');
const Allergy = require('../models/Allergy');
const User = require('../models/User');

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(id); } catch { return null; }
};

// GET /api/patients/:patientUserId/allergies
exports.listByPatient = async (req, res) => {
  try {
    const { patientUserId } = req.params;
    const patient = await User.findOne({ userId: decodeURIComponent(patientUserId), role: 'Patient' }).select('_id');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const items = await Allergy.find({ patientId: patient._id }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) {
    console.error('allergies/list error:', e);
    res.status(500).json({ message: 'Failed to fetch allergies' });
  }
};

// POST /api/patients/:patientUserId/allergies   (Doctor-only in UI)
exports.create = async (req, res) => {
  try {
    const { patientUserId } = req.params;
    const { substance, reaction, severity, notedOn, notes } = req.body;

    if (!substance || !substance.trim()) {
      return res.status(400).json({ message: 'Substance is required' });
    }

    const patient = await User.findOne({ userId: decodeURIComponent(patientUserId), role: 'Patient' }).select('_id');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doc = await Allergy.create({
      patientId: patient._id,
      substance: substance.trim(),
      reaction:  (reaction || '').trim(),
      severity:  severity || 'Mild',
      notedOn:   notedOn ? new Date(notedOn) : null,
      notes:     (notes || '').trim(),
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    res.status(201).json({ message: 'Allergy created', item: doc });
  } catch (e) {
    console.error('allergies/create error:', e);
    res.status(500).json({ message: 'Unable to create allergy' });
  }
};

// PUT /api/allergies/:id   (Doctor-only in UI)
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const _id = toObjectId(id);
    if (!_id) return res.status(400).json({ message: 'Invalid id' });

    const payload = {};
    ['substance', 'reaction', 'severity', 'notedOn', 'notes'].forEach((k) => {
      if (req.body[k] !== undefined) payload[k] = req.body[k];
    });
    if (payload.substance && !String(payload.substance).trim()) {
      return res.status(400).json({ message: 'Substance is required' });
    }
    if (payload.notedOn) payload.notedOn = new Date(payload.notedOn);
    payload.updatedBy = req.user?._id || null;

    const item = await Allergy.findByIdAndUpdate(_id, { $set: payload }, { new: true });
    if (!item) return res.status(404).json({ message: 'Allergy not found' });

    res.json({ message: 'Allergy updated', item });
  } catch (e) {
    console.error('allergies/update error:', e);
    res.status(500).json({ message: 'Unable to update allergy' });
  }
};

// DELETE /api/allergies/:id   (Doctor-only in UI)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const _id = toObjectId(id);
    if (!_id) return res.status(400).json({ message: 'Invalid id' });

    const item = await Allergy.findById(_id);
    if (!item) return res.status(404).json({ message: 'Allergy not found' });

    await item.deleteOne();
    res.json({ message: 'Allergy deleted' });
  } catch (e) {
    console.error('allergies/remove error:', e);
    res.status(500).json({ message: 'Unable to delete allergy' });
  }
};

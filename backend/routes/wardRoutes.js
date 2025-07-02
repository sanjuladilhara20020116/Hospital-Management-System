const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const User = require('../models/User'); // for doctor info

// ➕ Create a ward
router.post('/', async (req, res) => {
  const { wardName, wardType, capacity, assignedDoctors = [] } = req.body;

  if (!wardName || !wardType || !capacity || capacity < 1) {
    return res.status(400).json({ message: 'Invalid ward details' });
  }

  try {
    const newWard = new Ward({
      wardName,
      wardType,
      capacity,
      assignedDoctors
    });
    const saved = await newWard.save();
    const populated = await saved.populate('assignedDoctors');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ward' });
  }
});

// 📥 Get all wards (with populated doctor info)
router.get('/', async (req, res) => {
  try {
    const wards = await Ward.find().populate('assignedDoctors');
    res.json(wards);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching wards' });
  }
});

// ✏️ Update a ward
router.put('/:id', async (req, res) => {
  const { wardName, wardType, capacity } = req.body;

  if (!wardName || !wardType || !capacity || capacity < 1) {
    return res.status(400).json({ message: 'Invalid ward details' });
  }

  try {
    const updated = await Ward.findByIdAndUpdate(
      req.params.id,
      { wardName, wardType, capacity },
      { new: true }
    ).populate('assignedDoctors');
    if (!updated) return res.status(404).json({ message: 'Ward not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ward' });
  }
});

// ❌ Delete a ward
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Ward.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Ward not found' });
    res.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ward' });
  }
});

// ➕ Assign a doctor to a ward
router.post('/:id/assign-doctor', async (req, res) => {
  const { doctorId } = req.body;
  try {
    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ message: 'Ward not found' });

    if (!ward.assignedDoctors.includes(doctorId)) {
      ward.assignedDoctors.push(doctorId);
      await ward.save();
    }

    const populated = await Ward.findById(ward._id).populate('assignedDoctors');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign doctor' });
  }
});

// ❌ Remove a doctor from a ward
router.post('/:id/remove-doctor', async (req, res) => {
  const { doctorId } = req.body;
  try {
    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ message: 'Ward not found' });

    ward.assignedDoctors = ward.assignedDoctors.filter(id => id.toString() !== doctorId);
    await ward.save();

    const populated = await Ward.findById(ward._id).populate('assignedDoctors');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove doctor' });
  }
});

module.exports = router;

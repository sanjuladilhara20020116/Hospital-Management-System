const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');

// Get all wards
router.get('/', async (req, res) => {
  try {
    const wards = await Ward.find();
    res.json(wards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wards' });
  }
});

// Create a new ward
router.post('/', async (req, res) => {
  const { wardName, wardType, capacity } = req.body;

  if (!wardName || !wardType || !capacity || capacity < 1) {
    return res.status(400).json({ message: 'Invalid ward details' });
  }

  try {
    const newWard = new Ward({ wardName, wardType, capacity });
    const saved = await newWard.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ward' });
  }
});

// Update a ward
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
    );
    if (!updated) return res.status(404).json({ message: 'Ward not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ward' });
  }
});

// Delete a ward
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Ward.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Ward not found' });
    res.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ward' });
  }
});

module.exports = router;

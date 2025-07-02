const express = require('express');
const router = express.Router();
const Department = require('../models/Department');

// ✅ GET all departments (with assigned doctors)
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('assignedDoctors', 'firstName lastName userId');
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

// ✅ POST create new department
router.post('/', async (req, res) => {
  try {
    const { name, description, assignedDoctors } = req.body;

    const newDept = new Department({
      name,
      description,
      assignedDoctors: assignedDoctors || [],
    });

    await newDept.save();
    res.status(201).json({ message: 'Department created', department: newDept });
  } catch (err) {
    console.error('Error creating department:', err);

    if (err.code === 11000) {
      // Duplicate key error
      return res.status(409).json({ message: 'Department name already exists' });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});


// ✅ PUT update department by ID
router.put('/:id', async (req, res) => {
  try {
    const { name, description, assignedDoctors } = req.body;

    const updatedDept = await Department.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        assignedDoctors: assignedDoctors || []
      },
      { new: true }
    ).populate('assignedDoctors', 'firstName lastName userId');

    if (!updatedDept) return res.status(404).json({ message: 'Department not found' });

    res.json({ message: 'Department updated', department: updatedDept });
  } catch (err) {
    console.error('Error updating department:', err);
    res.status(400).json({ message: 'Failed to update department' });
  }
});

// ✅ DELETE department by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedDept = await Department.findByIdAndDelete(req.params.id);
    if (!deletedDept) return res.status(404).json({ message: 'Department not found' });

    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

module.exports = router;

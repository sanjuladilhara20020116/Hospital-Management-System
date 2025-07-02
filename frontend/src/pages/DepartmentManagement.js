import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Grid, Chip, Autocomplete, Snackbar, Alert
} from '@mui/material';
import axios from 'axios';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [deptData, setDeptData] = useState({ name: '', description: '', assignedDoctors: [] });
  const [editingId, setEditingId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to fetch departments');
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to fetch doctors');
    }
  };

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeptData(prev => ({ ...prev, [name]: value }));
  };

  const handleDoctorsChange = (event, values) => {
    setDeptData(prev => ({ ...prev, assignedDoctors: values }));
  };

  const handleAddOrUpdate = async () => {
    if (!deptData.name) {
      showAlert('error', 'Department name required');
      return;
    }
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/departments/${editingId}`, {
          name: deptData.name,
          description: deptData.description,
          assignedDoctors: deptData.assignedDoctors.map(doc => doc._id)
        });
        showAlert('success', 'Department updated');
      } else {
        await axios.post('http://localhost:5000/api/departments', {
          name: deptData.name,
          description: deptData.description,
          assignedDoctors: deptData.assignedDoctors.map(doc => doc._id)
        });
        showAlert('success', 'Department added');
      }
      setDeptData({ name: '', description: '', assignedDoctors: [] });
      setEditingId(null);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Operation failed');
    }
  };

  const handleEdit = (dept) => {
    setDeptData({
      name: dept.name,
      description: dept.description,
      assignedDoctors: dept.assignedDoctors || []
    });
    setEditingId(dept._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/departments/${id}`);
      showAlert('info', 'Department deleted');
      fetchDepartments();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Delete failed');
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h5" mb={3}>🏢 Department Management</Typography>

      <Paper sx={{ p: 2, mb: 4, maxWidth: 600 }}>
        <TextField
          fullWidth label="Department Name" name="name" value={deptData.name} onChange={handleChange} sx={{ mb: 2 }}
        />
        <TextField
          fullWidth label="Description" name="description" value={deptData.description} onChange={handleChange} sx={{ mb: 2 }}
        />

        <Autocomplete
          multiple
          options={doctors}
          getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.userId})`}
          value={deptData.assignedDoctors}
          onChange={handleDoctorsChange}
          renderInput={(params) => <TextField {...params} label="Assign Doctors" placeholder="Select doctors" />}
          sx={{ mb: 2 }}
        />

        <Button variant="contained" onClick={handleAddOrUpdate} fullWidth>
          {editingId ? 'Update Department' : 'Add Department'}
        </Button>
      </Paper>

      <Grid container spacing={2}>
        {departments.map(dept => (
          <Grid item xs={12} md={6} key={dept._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{dept.name}</Typography>
              <Typography variant="body2" mb={1}>{dept.description}</Typography>
              <Typography variant="subtitle2">Doctors:</Typography>
              {dept.assignedDoctors && dept.assignedDoctors.length > 0 ? (
                dept.assignedDoctors.map(doc => (
                  <Chip
                    key={doc._id}
                    label={`${doc.firstName} ${doc.lastName}`}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))
              ) : (
                <Typography>No doctors assigned</Typography>
              )}

              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => handleEdit(dept)}>✏️ Edit</Button>
                <Button variant="outlined" color="error" onClick={() => handleDelete(dept._id)}>🗑 Delete</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

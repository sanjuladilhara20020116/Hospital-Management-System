import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Grid, Paper, Snackbar, Alert, Chip, Autocomplete
} from '@mui/material';
import axios from 'axios';

// 🔍 Doctor Search & Assign Component
function DoctorSearchAssign({ wardId, onAssign }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      axios.get(`http://localhost:5000/api/users/search-doctors?query=${searchQuery}`)
        .then(res => setOptions(res.data))
        .catch(err => console.error(err));
    } else {
      setOptions([]);
    }
  }, [searchQuery]);

  const handleAssign = async () => {
    if (!selectedDoctor) return;
    try {
      await axios.post(`http://localhost:5000/api/wards/${wardId}/assign-doctor`, {
        doctorId: selectedDoctor._id
      });
      onAssign(); // refresh
      setSelectedDoctor(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Assign error:', err);
    }
  };

  return (
    <Box mt={1}>
      <Typography variant="subtitle1">Assign Doctor</Typography>
      <Autocomplete
        options={options}
        getOptionLabel={(option) => `${option.userId} - ${option.firstName} ${option.lastName}`}
        inputValue={searchQuery}
        onInputChange={(e, newInput) => setSearchQuery(newInput)}
        value={selectedDoctor}
        onChange={(e, value) => setSelectedDoctor(value)}
        renderInput={(params) => <TextField {...params} label="Search Doctor ID or Name" size="small" />}
        sx={{ mb: 1 }}
      />
      <Button variant="contained" onClick={handleAssign} disabled={!selectedDoctor} fullWidth>
        Assign
      </Button>
    </Box>
  );
}

export default function WardManagement() {
  const [wards, setWards] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [wardData, setWardData] = useState({ wardName: '', wardType: '', capacity: '' });
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  useEffect(() => {
    fetchWards();
    fetchDoctors();
  }, []);

  const fetchWards = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/wards');
      setWards(res.data.map(w => ({ ...w, _editing: false })));
    } catch (err) {
      console.error('Error fetching wards', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setWardData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddWard = async () => {
    const { wardName, wardType, capacity } = wardData;
    if (!wardName || !wardType || !capacity) {
      showAlert('error', 'Please fill all ward fields');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/wards', {
        ...wardData,
        assignedDoctors: selectedDoctors.map(doc => doc._id),
      });
      showAlert('success', 'Ward added successfully');
      fetchWards();
      setWardData({ wardName: '', wardType: '', capacity: '' });
      setSelectedDoctors([]);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to add ward');
    }
  };

  const handleRemoveDoctor = async (wardId, doctorId) => {
    try {
      await axios.post(`http://localhost:5000/api/wards/${wardId}/remove-doctor`, { doctorId });
      showAlert('info', 'Doctor removed');
      fetchWards();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to remove doctor');
    }
  };

  const handleUpdateWard = async (id, updatedWard) => {
    try {
      await axios.put(`http://localhost:5000/api/wards/${id}`, {
        wardName: updatedWard.wardName,
        wardType: updatedWard.wardType,
        capacity: updatedWard.capacity
      });
      showAlert('success', 'Ward updated');
      fetchWards();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to update ward');
    }
  };

  const handleDeleteWard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ward?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/wards/${id}`);
      showAlert('info', 'Ward deleted');
      fetchWards();
    } catch (err) {
      console.error(err);
      showAlert('error', 'Failed to delete ward');
    }
  };

  const enableEditWard = (id) => {
    setWards(prev =>
      prev.map(w => w._id === id ? { ...w, _editing: true } : w)
    );
  };

  const cancelEditWard = () => fetchWards();

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  return (
    <Box p={4}>
      <Typography variant="h5" mb={3}>🏥 Ward Management</Typography>

      <Grid container spacing={2}>
        {/* ➕ Add Ward Section */}
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Ward Name" name="wardName" value={wardData.wardName} onChange={handleChange} sx={{ mb: 2 }} />
          <TextField fullWidth label="Ward Type" name="wardType" value={wardData.wardType} onChange={handleChange} sx={{ mb: 2 }} />
          <TextField fullWidth label="Capacity" name="capacity" type="number" value={wardData.capacity} onChange={handleChange} sx={{ mb: 2 }} />

          <Autocomplete
            multiple
            options={doctors}
            getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.userId})`}
            value={selectedDoctors}
            onChange={(e, value) => setSelectedDoctors(value)}
            renderInput={(params) => (
              <TextField {...params} label="Assign Doctors" placeholder="Search doctor by ID or name" sx={{ mb: 2 }} />
            )}
          />

          <Button variant="contained" color="primary" onClick={handleAddWard}>
            ➕ Add Ward
          </Button>
        </Grid>

        {/* 🗂 Horizontal Ward Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" mb={2}>🗂 Existing Wards</Typography>
          <Box sx={{
            display: 'flex',
            overflowX: 'auto',
            gap: 2,
            pb: 2,
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: 4 },
            '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#555' }
          }}>
            {wards.map(ward => (
              <Paper key={ward._id} sx={{ minWidth: 320, p: 2, flexShrink: 0 }}>
                {ward._editing ? (
                  <>
                    <TextField fullWidth label="Ward Name" value={ward.wardName} onChange={(e) =>
                      setWards(prev => prev.map(w => w._id === ward._id ? { ...w, wardName: e.target.value } : w))
                    } sx={{ mb: 1 }} />
                    <TextField fullWidth label="Ward Type" value={ward.wardType} onChange={(e) =>
                      setWards(prev => prev.map(w => w._id === ward._id ? { ...w, wardType: e.target.value } : w))
                    } sx={{ mb: 1 }} />
                    <TextField fullWidth label="Capacity" type="number" value={ward.capacity} onChange={(e) =>
                      setWards(prev => prev.map(w => w._id === ward._id ? { ...w, capacity: e.target.value } : w))
                    } sx={{ mb: 1 }} />
                    <Button variant="contained" onClick={() => handleUpdateWard(ward._id, ward)}>Save</Button>
                    <Button onClick={cancelEditWard} sx={{ ml: 1 }}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Typography><strong>{ward.wardName}</strong> ({ward.wardType})</Typography>
                    <Typography>Capacity: {ward.capacity}</Typography>
                    <Typography sx={{ mt: 1 }}>Doctors:</Typography>
                    {ward.assignedDoctors?.length > 0 ? (
                      ward.assignedDoctors.map(doc => (
                        <Chip
                          key={doc._id}
                          label={`${doc.firstName} ${doc.lastName}`}
                          onDelete={() => handleRemoveDoctor(ward._id, doc._id)}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))
                    ) : (
                      <Typography>No doctors assigned</Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button variant="outlined" onClick={() => enableEditWard(ward._id)}>✏️ Edit</Button>
                      <Button variant="outlined" color="error" onClick={() => handleDeleteWard(ward._id)}>🗑 Delete</Button>
                    </Box>

                    <DoctorSearchAssign wardId={ward._id} onAssign={fetchWards} />
                  </>
                )}
              </Paper>
            ))}
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}

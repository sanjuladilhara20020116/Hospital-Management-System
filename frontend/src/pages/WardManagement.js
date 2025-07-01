import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Paper
} from '@mui/material';
import axios from 'axios';

export default function WardManagement() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newWard, setNewWard] = useState({ wardName: '', wardType: '', capacity: '' });
  const [editingWard, setEditingWard] = useState(null);
  const [deletingWard, setDeletingWard] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [alert, setAlert] = useState({ open: false, severity: '', message: '' });

  // Fetch wards
  const fetchWards = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/wards');
      setWards(res.data);
    } catch (err) {
      showAlert('error', 'Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  // Handle new ward input change
  const handleNewWardChange = (e) => {
    const { name, value } = e.target;
    setNewWard(prev => ({ ...prev, [name]: value }));
  };

  // Add new ward
  const handleAddWard = async () => {
    if (!newWard.wardName.trim() || !newWard.wardType.trim() || !newWard.capacity || newWard.capacity <= 0) {
      showAlert('warning', 'Please fill all fields with valid data to add a ward');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/wards', newWard);
      showAlert('success', 'Ward added successfully');
      setNewWard({ wardName: '', wardType: '', capacity: '' });
      fetchWards();
    } catch (err) {
      showAlert('error', 'Failed to add ward');
    }
  };

  // Open Edit Dialog
  const openEditDialog = (ward) => {
    setEditingWard({ ...ward });
    setEditOpen(true);
  };

  // Edit ward input change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingWard(prev => ({ ...prev, [name]: value }));
  };

  // Save edited ward
  const handleEditWard = async () => {
    if (!editingWard.wardName.trim() || !editingWard.wardType.trim() || !editingWard.capacity || editingWard.capacity <= 0) {
      showAlert('warning', 'Please fill all fields with valid data to update the ward');
      return;
    }
    try {
      await axios.put(`http://localhost:5000/api/wards/${editingWard._id}`, editingWard);
      showAlert('success', 'Ward updated successfully');
      setEditOpen(false);
      setEditingWard(null);
      fetchWards();
    } catch (err) {
      showAlert('error', 'Failed to update ward');
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (ward) => {
    setDeletingWard(ward);
    setDeleteOpen(true);
  };

  // Delete ward handler
  const handleDeleteWard = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/wards/${deletingWard._id}`);
      showAlert('success', 'Ward deleted successfully');
      setDeleteOpen(false);
      setDeletingWard(null);
      fetchWards();
    } catch (err) {
      showAlert('error', 'Failed to delete ward');
    }
  };

  return (
    <Grid container justifyContent="center" sx={{ p: 2 }}>
      <Grid item xs={12} md={8} component={Paper} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>Ward Management</Typography>

        {/* Add New Ward */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Add New Ward</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="Ward Name"
              name="wardName"
              value={newWard.wardName}
              onChange={handleNewWardChange}
              sx={{ flex: 1, minWidth: 150 }}
              required
            />
            <TextField
              label="Ward Type"
              name="wardType"
              value={newWard.wardType}
              onChange={handleNewWardChange}
              sx={{ flex: 1, minWidth: 150 }}
              required
            />
            <TextField
              label="Capacity"
              name="capacity"
              type="number"
              value={newWard.capacity}
              onChange={handleNewWardChange}
              sx={{ width: 100 }}
              inputProps={{ min: 1 }}
              required
            />
            <Button variant="contained" onClick={handleAddWard} sx={{ minWidth: 100 }}>
              Add
            </Button>
          </Box>
        </Box>

        {/* Ward List */}
        <Typography variant="h6" gutterBottom>Existing Wards</Typography>
        {loading ? (
          <Typography>Loading wards...</Typography>
        ) : wards.length === 0 ? (
          <Typography>No wards found.</Typography>
        ) : (
          wards.map((ward) => (
            <Box
              key={ward._id}
              sx={{
                p: 2, mb: 2, border: '1px solid #ccc', borderRadius: 2,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">{ward.wardName}</Typography>
                <Typography>Type: {ward.wardType}</Typography>
                <Typography>Capacity: {ward.capacity}</Typography>
              </Box>
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                  onClick={() => openEditDialog(ward)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => openDeleteDialog(ward)}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          ))
        )}

        {/* Edit Ward Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
          <DialogTitle>Edit Ward</DialogTitle>
          <DialogContent>
            <TextField
              label="Ward Name"
              name="wardName"
              fullWidth
              value={editingWard?.wardName || ''}
              onChange={handleEditChange}
              sx={{ mt: 2 }}
              required
            />
            <TextField
              label="Ward Type"
              name="wardType"
              fullWidth
              value={editingWard?.wardType || ''}
              onChange={handleEditChange}
              sx={{ mt: 2 }}
              required
            />
            <TextField
              label="Capacity"
              name="capacity"
              type="number"
              fullWidth
              value={editingWard?.capacity || ''}
              onChange={handleEditChange}
              sx={{ mt: 2 }}
              inputProps={{ min: 1 }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditWard}>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the ward <b>{deletingWard?.wardName}</b>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteWard}>Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Alert Snackbar */}
        <Snackbar
          open={alert.open}
          autoHideDuration={4000}
          onClose={() => setAlert(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Grid>
    </Grid>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import axios from 'axios';

export default function DoctorDashboard({ userId }) {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
        setProfile(res.data);
        setFormData(res.data);
        if (res.data.photo) setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
      } catch (err) {
        showAlert('error', 'Failed to load profile');
      }
    }
    fetchProfile();
  }, [userId]);

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      // Append each key/value; if value is a File, it works correctly
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined) data.append(key, value);
      });

      await axios.put(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showAlert('success', 'Profile updated successfully');
      setEditMode(false);

      // Refresh profile after update
      const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
      setProfile(res.data);
      setFormData(res.data);
      if (res.data.photo) setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
    } catch (err) {
      showAlert('error', 'Failed to update profile');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
      showAlert('success', 'Profile deleted. Logging out...');
      setTimeout(() => {
        localStorage.removeItem('user');
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      showAlert('error', 'Failed to delete profile');
    }
  };

  if (!profile) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={imagePreview}
            sx={{ width: 80, height: 80 }}
          />
          <Box>
            <Typography variant="h6">{profile.firstName} {profile.lastName}</Typography>
            <Typography>User ID: {profile.userId}</Typography>
            <Typography>Email: {profile.email}</Typography>
            <Typography>Specialty: {profile.specialty || '-'}</Typography>
          </Box>
        </CardContent>

        <CardContent>
          {editMode ? (
            <>
              <TextField
                label="First Name"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Specialty"
                name="specialty"
                value={formData.specialty || ''}
                onChange={handleChange}
                fullWidth
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                Upload New Photo
                <input hidden type="file" name="photo" accept="image/*" onChange={handleChange} />
              </Button>
              {imagePreview && (
                <Box component="img" src={imagePreview} alt="preview" sx={{ width: 120, height: 120, borderRadius: '50%' }} />
              )}
            </>
          ) : (
            <>
              <Typography><strong>NIC Number:</strong> {profile.nicNumber}</Typography>
              <Typography><strong>Gender:</strong> {profile.gender}</Typography>
              <Typography><strong>Age:</strong> {profile.age}</Typography>
              <Typography><strong>Address:</strong> {profile.address}</Typography>
              <Typography><strong>Contact Number:</strong> {profile.contactNumber}</Typography>
              <Typography><strong>Date of Birth:</strong> {profile.dateOfBirth?.substring(0, 10)}</Typography>
              <Typography><strong>SLMC Registration Number:</strong> {profile.slmcRegistrationNumber}</Typography>
            </>
          )}
        </CardContent>

        <CardActions>
          {editMode ? (
            <>
              <Button variant="contained" color="primary" onClick={handleSave}>Save</Button>
              <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button variant="contained" onClick={() => setEditMode(true)}>Edit Profile</Button>
              <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>Delete Profile</Button>
            </>
          )}
        </CardActions>
      </Card>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete your profile? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

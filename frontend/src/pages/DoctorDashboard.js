import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Stack, Chip, InputAdornment, useTheme
} from '@mui/material';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import HomeIcon from '@mui/icons-material/Home';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CakeIcon from '@mui/icons-material/Cake';
import VaccinesIcon from '@mui/icons-material/Vaccines';

export default function DoctorDashboard({ userId }) {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const theme = useTheme();

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
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined) data.append(key, value);
      });

      await axios.put(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showAlert('success', 'Profile updated successfully');
      setEditMode(false);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (!profile) return <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Typography>;

  const labelStyle = { fontWeight: 600, color: 'text.secondary', minWidth: 180 };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, px: { xs: 2, sm: 3 }, pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}22, ${theme.palette.success.light}22)`,
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={imagePreview}
            sx={{
              width: 84, height: 84,
              border: `3px solid ${theme.palette.background.paper}`,
              boxShadow: '0 10px 30px rgba(2,6,23,.15)'
            }}
          />
          <Box sx={{
            position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: '50%',
            bgcolor: 'success.main', border: `2px solid ${theme.palette.background.paper}`
          }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {profile.firstName} {profile.lastName}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={`User ID: ${profile.userId}`} />
            <Chip size="small" color="primary" variant="outlined" label={profile.specialty || 'General'} icon={<WorkspacePremiumIcon />} />
            <Chip size="small" variant="outlined" label={profile.email} icon={<EmailIcon />} />
          </Stack>
        </Box>

        {/* Action buttons */}
        <Stack direction="row" spacing={1}>
          {editMode ? (
            <>
              <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Save
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* ✅ New Vaccination button */}
              <Button
                variant="contained"
                color="success"
                startIcon={<VaccinesIcon />}
                component={Link}
                to="/vaccinations/search"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Vaccination
              </Button>

              <Button variant="contained" onClick={() => setEditMode(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Edit Profile
              </Button>
              <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Delete
              </Button>
              <Button variant="outlined" color="secondary" onClick={handleLogout} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Logout
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Profile Card */}
      <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 10px 30px rgba(2,6,23,.06)' }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Profile Details
          </Typography>
        </CardContent>
        <Divider sx={{ my: 1 }} />
        <CardContent sx={{ pt: 0 }}>
          {editMode ? (
            <Stack spacing={2}>
              <TextField label="First Name" name="firstName" value={formData.firstName || ''} onChange={handleChange} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment> }}
              />
              <TextField label="Last Name" name="lastName" value={formData.lastName || ''} onChange={handleChange} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineIcon color="action" /></InputAdornment> }}
              />
              <TextField label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment> }}
              />
              <TextField label="Specialty" name="specialty" value={formData.specialty || ''} onChange={handleChange} fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start"><WorkspacePremiumIcon color="action" /></InputAdornment> }}
              />
              <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                Upload New Photo
                <input hidden type="file" name="photo" accept="image/*" onChange={handleChange} />
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography><strong>NIC Number:</strong> {profile.nicNumber || '-'}</Typography>
              <Typography><strong>Gender:</strong> {profile.gender || '-'}</Typography>
              <Typography><strong>Age:</strong> {profile.age || '-'}</Typography>
              <Typography><strong>Address:</strong> {profile.address || '-'}</Typography>
              <Typography><strong>Contact Number:</strong> {profile.contactNumber || '-'}</Typography>
              <Typography><strong>Date of Birth:</strong> {profile.dateOfBirth?.substring(0, 10) || '-'}</Typography>
              <Typography><strong>SLMC Registration #:</strong> {profile.slmcRegistrationNumber || '-'}</Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Confirm Delete */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Delete</DialogTitle>
        <DialogContent sx={{ color: 'text.secondary' }}>
          Are you sure you want to delete your profile? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

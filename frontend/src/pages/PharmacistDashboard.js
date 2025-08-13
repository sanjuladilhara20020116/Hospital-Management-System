import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Paper, InputAdornment, Divider, useTheme
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as IdIcon,
  Wc as GenderIcon,
  Cake as CakeIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Medication as PharmacyIcon,
  Upload as UploadIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import axios from 'axios';

export default function PharmacistDashboard({ userId }) {
  const theme = useTheme();
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

  if (!profile) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Typography color="text.secondary">Loading...</Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', my: 4, px: { xs: 2, sm: 3 } }}>
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Header with Logout */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: theme.palette.primary.contrastText,
            px: 3, py: 3
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Avatar
                src={imagePreview}
                sx={{
                  width: 96, height: 96,
                  border: `3px solid ${theme.palette.background.paper}`,
                  boxShadow: 3
                }}
              />
            </Grid>
            <Grid item xs>
              <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PharmacyIcon sx={{ opacity: 0.9 }} /> Pharmacist Profile
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
                {profile.firstName} {profile.lastName}
              </Typography>
              <Typography sx={{ opacity: 0.85 }}>
                User ID: {profile.userId} &nbsp;•&nbsp; Email: {profile.email}
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}
                sx={{
                  borderRadius: 2,
                  px: 2.5,
                  backgroundColor: theme.palette.error.main,
                  boxShadow: 'none',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: theme.palette.error.dark, boxShadow: 'none' }
                }}
              >
                Logout
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Content */}
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {editMode ? (
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                  Upload New Photo
                  <input hidden type="file" name="photo" accept="image/*" onChange={handleChange} />
                </Button>
                {imagePreview && (
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={imagePreview} sx={{ width: 64, height: 64 }} />
                    <Typography color="text.secondary">New photo preview</Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="NIC Number"
                  name="nicNumber"
                  value={formData.nicNumber || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><IdIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Gender"
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><GenderIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Age"
                  name="age"
                  type="number"
                  value={formData.age || ''}
                  onChange={handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Number"
                  name="contactNumber"
                  value={formData.contactNumber || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><HomeIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth?.substring(0, 10) || ''}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><CakeIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Pharmacist ID"
                  name="pharmacistId"
                  value={formData.pharmacistId || ''}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><IdIcon color="action" /></InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    NIC Number
                  </Typography>
                  <Typography>{profile.nicNumber || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Gender
                  </Typography>
                  <Typography>{profile.gender || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Age
                  </Typography>
                  <Typography>{profile.age || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Contact Number
                  </Typography>
                  <Typography>{profile.contactNumber || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Date of Birth
                  </Typography>
                  <Typography>{profile.dateOfBirth?.substring(0, 10) || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Pharmacist ID
                  </Typography>
                  <Typography>{profile.pharmacistId || '—'}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: .5 }}>
                    Address
                  </Typography>
                  <Typography>{profile.address || '—'}</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          {editMode ? (
            <>
              <Button variant="contained" color="primary" onClick={handleSave} sx={{ borderRadius: 2, px: 3 }}>
                Save
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => setEditMode(false)} sx={{ borderRadius: 2, px: 3 }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Box>
                <Button variant="contained" onClick={() => setEditMode(true)} sx={{ borderRadius: 2, px: 3, mr: 2 }}>
                  Edit Profile
                </Button>
                <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)} sx={{ borderRadius: 2, px: 3 }}>
                  Delete Profile
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Keep your profile details up to date
              </Typography>
            </>
          )}
        </CardActions>
      </Card>

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

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
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

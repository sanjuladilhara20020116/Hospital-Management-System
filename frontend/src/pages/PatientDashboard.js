import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle, 
  DialogContent, DialogActions, Fab, Grid, Paper,
  InputAdornment, useTheme, Badge, Container, CircularProgress
} from '@mui/material';
import {
  Chat as ChatIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Cake as CakeIcon,
  Home as HomeIcon,
  Wc as GenderIcon,
  Badge as NicIcon,
  MedicalServices as MedicalIcon,
  Upload as UploadIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from 'axios';
import ChatPopup from './ChatPopup';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard({ userId }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
        setProfile(res.data);
        setFormData(res.data);
        if (res.data.photo) {
          setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
        }
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
      for (let key in formData) {
        if (formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      }

      await axios.put(
        `http://localhost:5000/api/users/${encodeURIComponent(userId)}`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      showAlert('success', 'Profile updated successfully');
      setEditMode(false);

      const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
      setProfile(res.data);
      setFormData(res.data);
      if (res.data.photo) setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
    } catch (err) {
      console.error(err);
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
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Profile Header */}
            <Paper elevation={0} sx={{ 
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              p: 3,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3
            }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item>
                  <Avatar 
                    src={imagePreview} 
                    sx={{ 
                      width: 100, 
                      height: 100,
                      border: `3px solid ${theme.palette.background.paper}`
                    }} 
                  />
                </Grid>
                <Grid item xs>
                  <Typography variant="h4" fontWeight={700}>
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Patient ID: {profile.userId}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Profile Content */}
            <Box sx={{ p: 3 }}>
              {editMode ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="First Name"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
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
                      value={formData.email || ''}
                      onChange={handleChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      fullWidth
                    >
                      Upload New Photo
                      <input hidden type="file" name="photo" accept="image/*" onChange={handleChange} />
                    </Button>
                    {imagePreview && (
                      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                        <Avatar src={imagePreview} sx={{ width: 60, height: 60, mr: 2 }} />
                        <Typography variant="body2">New photo preview</Typography>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="NIC Number"
                      name="nicNumber"
                      value={formData.nicNumber || ''}
                      onChange={handleChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <NicIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Gender"
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <GenderIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Age"
                      name="age"
                      type="number"
                      value={formData.age || ''}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Contact Number"
                      name="contactNumber"
                      value={formData.contactNumber || ''}
                      onChange={handleChange}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="action" />
                          </InputAdornment>
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
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <HomeIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
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
                          <InputAdornment position="start">
                            <CakeIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <EmailIcon color="primary" sx={{ mr: 1 }} /> Email
                      </Typography>
                      <Typography>{profile.email}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <NicIcon color="primary" sx={{ mr: 1 }} /> NIC Number
                      </Typography>
                      <Typography>{profile.nicNumber || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <GenderIcon color="primary" sx={{ mr: 1 }} /> Gender
                      </Typography>
                      <Typography>{profile.gender || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <CakeIcon color="primary" sx={{ mr: 1 }} /> Age
                      </Typography>
                      <Typography>{profile.age || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon color="primary" sx={{ mr: 1 }} /> Contact Number
                      </Typography>
                      <Typography>{profile.contactNumber || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <CakeIcon color="primary" sx={{ mr: 1 }} /> Date of Birth
                      </Typography>
                      <Typography>{profile.dateOfBirth?.substring(0, 10) || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <HomeIcon color="primary" sx={{ mr: 1 }} /> Address
                      </Typography>
                      <Typography>{profile.address || 'Not provided'}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          </CardContent>

          <CardActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
            {editMode ? (
              <>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSave}
                  startIcon={<SaveIcon />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => setEditMode(false)}
                  startIcon={<CancelIcon />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Box>
                  <Button 
                    variant="contained" 
                    onClick={() => setEditMode(true)}
                    startIcon={<EditIcon />}
                    sx={{ borderRadius: 2, px: 3, mr: 2 }}
                  >
                    Edit Profile
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setDeleteDialogOpen(true)}
                    startIcon={<DeleteIcon />}
                    sx={{ borderRadius: 2, px: 3, mr: 2 }}
                  >
                    Delete Account
                  </Button>
                  {/* Logout button (no new function added) */}
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
                    sx={{ borderRadius: 2, px: 3 }}
                  >
                    Logout
                  </Button>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => navigate('/packages')}
                  startIcon={<MedicalIcon />}
                  sx={{ borderRadius: 2, px: 3 }}
                >
                  Health Packages
                </Button>
              </>
            )}
          </CardActions>
        </Card>
      </Container>

      <Snackbar 
        open={alert.open} 
        autoHideDuration={4000} 
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity={alert.severity} 
          variant="filled" 
          sx={{ width: '100%', borderRadius: 2 }}
          iconMapping={{
            success: <CheckCircleIcon fontSize="inherit" />
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Warning: This action is irreversible!
          </Alert>
          <Typography>
            Are you sure you want to permanently delete your account? 
            All your data will be removed from our systems.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            color="error" 
            onClick={handleDelete}
            variant="contained"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      <Badge 
        color="error" 
        variant="dot" 
        invisible={!hasUnreadMessages}
        overlap="circular"
      >
        <Fab 
          color="primary" 
          aria-label="chat" 
          onClick={() => {
            setChatOpen(prev => !prev);
            setHasUnreadMessages(false);
          }} 
          sx={{ 
            position: 'fixed', 
            bottom: 32, 
            right: 32, 
            zIndex: 1000,
            width: 56,
            height: 56
          }}
        >
          <ChatIcon />
        </Fab>
      </Badge>

      {chatOpen && <ChatPopup onClose={() => setChatOpen(false)} setUnread={setHasUnreadMessages} />}
    </>
  );
}

// PatientDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Fab, Grid, Paper,
  InputAdornment, useTheme, Badge, Container, CircularProgress,
  Chip, Divider, Stack, IconButton
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
  CheckCircle as CheckCircleIcon,
  LocalHospital as LocalHospitalIcon,
  CalendarMonth as CalendarMonthIcon,
  CreditCard as CreditCardIcon,
  Description as DescriptionIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import axios from 'axios';
import ChatPopup from './ChatPopup';
import { useNavigate } from 'react-router-dom';

/* Attach stylesheet with the pd-* classes */
import './PatientDashboard.css';

export default function PatientDashboard({ userId }) {
  const theme = useTheme();
  const navigate = useNavigate();

  // ---------------- state (unchanged) ----------------
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [searchDate, setSearchDate] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState(null);
  const [editSlotDuration, setEditSlotDuration] = useState(0);

  const [deleteApptDialogOpen, setDeleteApptDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // ---------------- helpers (unchanged) ----------------
  const showAlert = (severity, message) => setAlert({ open: true, severity, message });

  const handleShowAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${appointmentId}/delete`);
      showAlert('success', 'Appointment deleted');
      setDeleteApptDialogOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to delete appointment';
      showAlert('error', msg);
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
        setProfile(res.data);
        setFormData(res.data);
        if (res.data.photo) setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
      } catch {
        showAlert('error', 'Failed to load profile');
      }
    }
    fetchProfile();
  }, [userId]);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const res = await axios.get(`http://localhost:5000/api/appointments/patients`, { params: { patientId: userId } });
      setAppointments(Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []));
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => { fetchAppointments(); /* eslint-disable-next-line */ }, [userId]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files?.length) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
    } else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      for (let key in formData) if (formData[key] !== undefined && formData[key] !== null) data.append(key, formData[key]);
      await axios.put(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      showAlert('success', 'Profile updated successfully');
      setEditMode(false);
      const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
      setProfile(res.data);
      setFormData(res.data);
      if (res.data.photo) setImagePreview(`http://localhost:5000/uploads/${res.data.photo}`);
    } catch {
      showAlert('error', 'Failed to update profile');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);
      showAlert('success', 'Profile deleted. Logging out...');
      setTimeout(() => { localStorage.removeItem('user'); window.location.href = '/'; }, 2000);
    } catch { showAlert('error', 'Failed to delete profile'); }
  };

  const handleEditAppointment = async (appointment) => {
    setEditAppointment(appointment);
    setEditDialogOpen(true);
    try {
      const res = await axios.get('http://localhost:5000/api/appointments/doctors/slots', { params: { doctorId: appointment.doctorId, date: appointment.date } });
      setEditSlotDuration(res.data?.durationMinutes || 0);
    } catch { setEditSlotDuration(0); }
  };

  const handleEditStartTimeChange = (newStartTime) => {
    let endTime = '';
    if (editSlotDuration && /^\d{2}:\d{2}$/.test(newStartTime)) {
      const [h, m] = newStartTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + editSlotDuration;
      const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');
      endTime = `${endH}:${endM}`;
    }
    setEditAppointment(prev => ({ ...prev, startTime: newStartTime, endTime }));
  };

  const handleSaveEditAppointment = async () => {
    try {
      await axios.patch(`http://localhost:5000/api/appointments/${editAppointment._id}/edit`, { startTime: editAppointment.startTime });
      showAlert('success', 'Appointment rescheduled');
      setEditDialogOpen(false);
      fetchAppointments();
    } catch { showAlert('error', 'Failed to reschedule appointment'); }
  };

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredAppointments = searchDate ? appointments.filter(a => a.date === searchDate) : appointments;

  return (
    <>
      <Container maxWidth={false} disableGutters className="patient-dashboard pd-full-bleed">
  <Card elevation={3} className="pd-card">

          <CardContent sx={{ p: 0 }}>
            {/* ---------------- Hero ---------------- */}
            <Paper elevation={0} className="pd-hero">
              <Grid container spacing={3} alignItems="center">
                <Grid item>
                  <Avatar src={imagePreview} className="pd-avatar" />
                </Grid>
                <Grid item xs>
                  <Typography variant="h4" className="pd-name">
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Typography variant="body1" className="pd-id">
                    Patient ID: {profile.userId}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* ---------------- Info ---------------- */}
            <Box className="pd-info-wrap">
              {editMode ? (
                // 🔁 original edit form (unchanged logic)
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
                <>
                  <div className="pd-info-grid">
                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><EmailIcon color="primary" /> Email</div>
                      <div className="pd-info-value">{profile.email}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><NicIcon color="primary" /> NIC Number</div>
                      <div className="pd-info-value">{profile.nicNumber || 'Not provided'}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><GenderIcon color="primary" /> Gender</div>
                      <div className="pd-info-value">{profile.gender || 'Not provided'}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><CakeIcon color="primary" /> Age</div>
                      <div className="pd-info-value">{profile.age || 'Not provided'}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><PhoneIcon color="primary" /> Contact Number</div>
                      <div className="pd-info-value">{profile.contactNumber || 'Not provided'}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card">
                      <div className="pd-info-label"><CakeIcon color="primary" /> Date of Birth</div>
                      <div className="pd-info-value">{profile.dateOfBirth?.substring(0, 10) || 'Not provided'}</div>
                    </Paper>

                    <Paper elevation={0} className="pd-info-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="pd-info-label"><HomeIcon color="primary" /> Address</div>
                      <div className="pd-info-value">{profile.address || 'Not provided'}</div>
                    </Paper>
                  </div>

                  {/* CTA row under the info tiles */}
                  <div className="pd-cta-row">
                    <Button
                      type="button"
                      className="pd-btn-outline pd-btn-blue"
                      onClick={() => setEditMode(true)}
                      startIcon={<EditIcon />}
                    >
                      Edit Profile
                    </Button>

                    <Button
                      type="button"
                      className="pd-btn-outline pd-btn-red"
                      onClick={() => setDeleteDialogOpen(true)}
                      startIcon={<DeleteIcon />}
                    >
                      Delete Account
                    </Button>

                    <Button
                      type="button"
                      className="pd-btn-outline pd-btn-gray"
                      onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
                    >
                      Logout
                    </Button>
                  </div>
                </>
              )}
            </Box>

            {/* ---------------- Actions ---------------- */}
            {/* ---------------- Actions (view mode only) ---------------- */}
{!editMode && (
  <Box className="pd-actions-wrap">
    <Typography variant="h6" className="pd-section-title">Actions</Typography>

    <div className="pd-actions">
      <button
        type="button"
        className="pd-action-card pd-action--lab"
        onClick={() => navigate('/my-reports')}
        aria-label="Lab Reports"
      >
        <span className="pd-action-icon"><ScienceOutlined /></span>
        <span>
          <div className="pd-action-title">Lab Reports</div>
          <div className="pd-action-sub">View your lab results</div>
        </span>
      </button>

      <button
        type="button"
        className="pd-action-card pd-action--med"
        onClick={() => navigate('/patient/medical-records')}
        aria-label="Medical Reports"
      >
        <span className="pd-action-icon"><DescriptionIcon /></span>
        <span>
          <div className="pd-action-title">Medical Reports</div>
          <div className="pd-action-sub">Clinical summaries &amp; notes</div>
        </span>
      </button>

      <button
        type="button"
        className="pd-action-card pd-action--pkg"
        onClick={() => navigate('/packages')}
        aria-label="Health Packages"
      >
        <span className="pd-action-icon"><MedicalIcon /></span>
        <span>
          <div className="pd-action-title">Health Packages</div>
          <div className="pd-action-sub">Curated wellness bundles</div>
        </span>
      </button>

      <button
        type="button"
        className="pd-action-card pd-action--apt"
        onClick={() => navigate('/appointments')}
        aria-label="Book Appointment"
      >
        <span className="pd-action-icon"><CalendarMonthIcon /></span>
        <span>
          <div className="pd-action-title">Book Appointment</div>
          <div className="pd-action-sub">Schedule your next visit</div>
        </span>
      </button>
    </div>
  </Box>
)}


            {/* ---------------- Appointments ---------------- */}
            {/* ---------------- Appointments (view mode only) ---------------- */}
{!editMode && (
  <Box className="pd-appointments">
    <Divider sx={{ my: 1.5 }} />
    <Typography variant="h6" className="pd-section-title">My Appointment</Typography>

    <div className="pd-search">
      <TextField
        label="Search by Date"
        type="date"
        value={searchDate}
        onChange={e => setSearchDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small"><CalendarMonthIcon fontSize="small" /></IconButton>
              <IconButton size="small"><FilterIcon fontSize="small" /></IconButton>
            </InputAdornment>
          )
        }}
      />
      {searchDate && (
        <Button type="button" onClick={() => setSearchDate('')} variant="outlined" size="medium">
          Clear
        </Button>
      )}
    </div>

    {loadingAppointments ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    ) : filteredAppointments.length === 0 ? (
      <Typography className="pd-empty">
        {appointments.length === 0 ? 'You have no appointments yet.' : 'No appointments found for this date.'}
      </Typography>
    ) : (
      <Grid container spacing={1.5}>
        {filteredAppointments.map((a) => (
          <Grid item xs={12} key={a._id || a.referenceNo}>
            <Paper
              variant="outlined"
              className="pd-appt-row"
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                minWidth: 720,
                maxWidth: 1000,
                width: '100%',
                mx: 'auto',
                cursor: 'pointer'
              }}
              onClick={() => handleShowAppointmentDetails(a)}
            >
              <Box>
                <Typography variant="body1" fontWeight={600}>Ref: {a.referenceNo}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {a.date} : {a.startTime}{a.endTime ? ` - ${a.endTime}` : ''} • Queue {a.queueNo ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Doctor: {a.doctorName || a.doctorId}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={e => e.stopPropagation()}>
                <Chip
                  size="small"
                  label={a.status || 'Pending'}
                  color={
                    a.status === 'Confirmed' ? 'success' :
                    a.status === 'Cancelled' ? 'default' : 'warning'
                  }
                />
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEditAppointment(a)}
                  disabled={a.status === 'Cancelled'}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => { setAppointmentToDelete(a); setDeleteApptDialogOpen(true); }}
                  disabled={a.status === 'Cancelled'}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
)}

          </CardContent>

          {/* ---------------- Bottom actions (original logic) ---------------- */}
          {editMode && (
  <CardActions sx={{ p: 3, pt: 0, gap: 1.5 }}>
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
  </CardActions>
)}

        </Card>
      </Container>

      {/* ---------------- Global dialogs & notifications (unchanged logic) ---------------- */}

      {/* Toast */}
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
          iconMapping={{ success: <CheckCircleIcon fontSize="inherit" /> }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Account delete confirm */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Warning: This action is irreversible!
          </Alert>
          <Typography>
            Are you sure you want to permanently delete your account? All your data will be removed from our systems.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2, px: 3 }}>
            Cancel
          </Button>
          <Button color="error" onClick={handleDelete} variant="contained" sx={{ borderRadius: 2, px: 3 }}>
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single details dialog (patient appointment details) */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedAppointment && (
          <Box sx={{ background: 'linear-gradient(120deg, #fdfefeff 0%, #f5f7fa 100%)', borderRadius: 2 }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#d6e7f9', color: '#000', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
              <CheckCircleIcon sx={{ color: '#43a047', fontSize: 32, mr: 1 }} />
              Appointment Details
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              <Stack alignItems="center" spacing={1} mb={2}>
                <Chip label={`Reference No: ${selectedAppointment.referenceNo}`} color="primary" variant="filled" sx={{ fontWeight: 700, fontSize: 16 }} />
                <Chip
                  label={selectedAppointment.status}
                  color={selectedAppointment.status === 'Cancelled' ? 'default' : selectedAppointment.status === 'Confirmed' ? 'success' : 'warning'}
                  sx={{ fontWeight: 700, fontSize: 15 }}
                />
              </Stack>
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#e3f0ff' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  <LocalHospitalIcon sx={{ mr: 1, mb: -0.5 }} />
                  Doctor Details
                </Typography>
                <Typography><b>Name:</b> {selectedAppointment.doctorName || selectedAppointment.doctorId}</Typography>
              </Box>
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#f5f7fa' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  <PersonIcon sx={{ mr: 1, mb: -0.5 }} />
                  Patient Details
                </Typography>
                <Typography><b>Name:</b> {selectedAppointment.patientName}</Typography>
                <Typography><b>Email:</b> {selectedAppointment.patientEmail || 'N/A'}</Typography>
                <Typography><b>Phone:</b> {selectedAppointment.patientPhone}</Typography>
                <Typography><b>NIC:</b> {selectedAppointment.patientNIC || 'N/A'}</Typography>
                <Typography><b>Passport:</b> {selectedAppointment.patientPassport || 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#e3f0ff' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  <CalendarMonthIcon sx={{ mr: 1, mb: -0.5 }} />
                  Scheduled Date & Time
                </Typography>
                <Typography><b>Date:</b> {selectedAppointment.date}</Typography>
                <Typography><b>Time:</b> {selectedAppointment.startTime} - {selectedAppointment.endTime}</Typography>
                <Typography><b>Queue No:</b> {selectedAppointment.queueNo}</Typography>
                <Typography><b>Reason:</b> {selectedAppointment.reason || 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#f5f7fa' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  <CreditCardIcon sx={{ mr: 1, mb: -0.5 }} />
                  Payment Details
                </Typography>
                <Typography><b>Payment Method:</b> {selectedAppointment.paymentMethod}</Typography>
                <Typography><b>Total Paid:</b> <span style={{ color: '#388e3c', fontWeight: 600 }}>Rs. {selectedAppointment.priceLkr?.toLocaleString()}</span></Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ background: '#f5f7fa', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
              <Button onClick={() => setDetailsDialogOpen(false)} variant="contained" color="primary" sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}>
                Close
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* Delete one appointment */}
      <Dialog open={deleteApptDialogOpen} onClose={() => setDeleteApptDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Appointment</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this appointment?</Typography>
          {appointmentToDelete && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">Ref: {appointmentToDelete.referenceNo}</Typography>
              <Typography variant="body2">Date: {appointmentToDelete.date} {appointmentToDelete.startTime} - {appointmentToDelete.endTime}</Typography>
              <Typography variant="body2">Doctor: {appointmentToDelete.doctorName || appointmentToDelete.doctorId}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteApptDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDeleteAppointment(appointmentToDelete._id)}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Reschedule one appointment */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reschedule Appointment</DialogTitle>
        <DialogContent>
          {editAppointment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Doctor"
                  value={editAppointment.doctorName || editAppointment.doctorId || ''}
                  fullWidth
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={editAppointment.date || ''}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={editAppointment.startTime || ''}
                  onChange={e => handleEditStartTimeChange(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={editAppointment.endTime || ''}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  disabled
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEditAppointment}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Chat FAB */}
      <Badge color="error" variant="dot" invisible={!hasUnreadMessages} overlap="circular">
        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => { setChatOpen(prev => !prev); setHasUnreadMessages(false); }}
          sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000, width: 56, height: 56 }}
        >
          <ChatIcon />
        </Fab>
      </Badge>
      {chatOpen && <ChatPopup onClose={() => setChatOpen(false)} setUnread={setHasUnreadMessages} />}
    </>
  );
}

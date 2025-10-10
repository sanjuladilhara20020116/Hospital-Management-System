import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardActions, Button,
  TextField, Avatar, Snackbar, Alert, Dialog, DialogTitle, 
  DialogContent, DialogActions, Fab, Grid, Paper,
  InputAdornment, useTheme, Badge, Container, CircularProgress,
  Chip, Divider, Stack
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
  AccessTime as AccessTimeIcon,
  AssignmentInd as AssignmentIndIcon,
  CreditCard as CreditCardIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import axios from 'axios';
import ChatPopup from './ChatPopup';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';

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

  //appointment details crud eke frontend  tika 
  // ✅ NEW: appointments list state (safe)
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  // Search/filter state
  const [searchDate, setSearchDate] = useState('');

  // NEW: Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState(null);
  const [editSlotDuration, setEditSlotDuration] = useState(0); // in minutes

    // NEW: Delete appointment state
  const [deleteApptDialogOpen, setDeleteApptDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

    // NEW: Appointment details popup state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // NEW: Handler to open details dialog
  const handleShowAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  // NEW: Delete appointment method // connected
  const handleDeleteAppointment = async (appointmentId) => {
    try {//frontend connect backend axios 
      await axios.delete(`http://localhost:5000/api/appointments/${appointmentId}/delete`);//delete method call
      showAlert('success', 'Appointment deleted');
      setDeleteApptDialogOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to delete appointment';
      showAlert('error', msg);
    }
  };

  useEffect(() => {//read some data 
    async function fetchProfile() {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${encodeURIComponent(userId)}`);//data linked
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

  // ✅ NEW: fetch patient appointments (safe – won’t crash if endpoint missing)
  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      // Use the correct backend API for patient appointments
      const res = await axios.get(
        `http://localhost:5000/api/appointments/patients`,        //appointment details loading backend connected part eka me
        { params: { patientId: userId } }
      );
      setAppointments(Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []));
    } catch (e) {
      // Silent fallback; don’t break dashboard if route isn’t available yet
      // Optionally show: showAlert('info', 'Appointments not available yet.');
    } finally {
      setLoadingAppointments(false);   // appointment dann kalin his da balana eka
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ✅ NEW: cancel handler (SAFE MODE; uses your specified endpoint)
  const handleCancelAppointment = async (appointmentId) => {
    try {
      await axios.post(`http://localhost:5000/api/appointments/${appointmentId}/cancel`);     //cancel appointment
      showAlert('success', 'Appointment cancelled');
      fetchAppointments(); // refresh list
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to cancel appointment';
      showAlert('error', msg);
    }
  };

  // Fetch slot duration for the doctor when editing
  const handleEditAppointment = async (appointment) => {                  //edit oopintment 
    setEditAppointment(appointment);
    setEditDialogOpen(true);
    try {
      const res = await axios.get(
        'http://localhost:5000/api/appointments/doctors/slots',
        { params: { doctorId: appointment.doctorId, date: appointment.date } }
      );
      // Use durationMinutes from backend
      setEditSlotDuration(res.data?.durationMinutes || 0);
    } catch (e) {
      setEditSlotDuration(0);
    }
  };

  // When start time changes, update end time automatically
  const handleEditStartTimeChange = (newStartTime) => {
    let endTime = '';
    if (editSlotDuration && /^\d{2}:\d{2}$/.test(newStartTime)) {            //automatically change time slot to the user 
      const [h, m] = newStartTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + editSlotDuration;
      const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
      const endM = String(endMin % 60).padStart(2, '0');
      endTime = `${endH}:${endM}`;
    }
    setEditAppointment(prev => ({ ...prev, startTime: newStartTime, endTime }));
  };
   // save edit Appointment rescheduled details  
  const handleSaveEditAppointment = async () => {
    try {
      await axios.patch(
        `http://localhost:5000/api/appointments/${editAppointment._id}/edit`,
        { startTime: editAppointment.startTime }
      );                            
      showAlert('success', 'Appointment rescheduled');
      setEditDialogOpen(false);
      fetchAppointments();
    } catch (e) {
      showAlert('error', 'Failed to reschedule appointment');
    }
  };

  if (!profile) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Filter appointments by searchDate
  const filteredAppointments = searchDate
    ? appointments.filter(a => a.date === searchDate)
    : appointments;

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

            {/* ✅ NEW: My Appointments (safe, collapsible feel via divider) */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                My Appointments
              </Typography>

              {/* Search/filter by date */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Search by Date"
                  type="date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="medium"
                  sx={{ minWidth: 260, width: 320 }}
                />
                {searchDate && (
                  <Button onClick={() => setSearchDate('')} variant="outlined" size="medium">Clear</Button>
                )}
              </Box>

              {loadingAppointments ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredAppointments.length === 0 ? (
                <Typography color="text.secondary">
                  {appointments.length === 0 ? 'You have no appointments yet.' : 'No appointments found for this date.'}
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {filteredAppointments.map((a) => (
                    <Grid item xs={12} key={a._id || a.referenceNo}>
                      <Paper
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, minWidth: 720, maxWidth: 1000, width: '100%', mx: 'auto', cursor: 'pointer' }}
                        onClick={() => handleShowAppointmentDetails(a)}
                      >
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            Ref: {a.referenceNo}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {a.date} : {a.startTime}{a.endTime ? ` - ${a.endTime}` : ''} • Queue {a.queueNo ?? '-'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Doctor: {a.doctorName || a.doctorId}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={e => e.stopPropagation()}>
      {/* Appointment Details Popup Dialog - Single Column, Ordered Sections */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedAppointment && ( 
          <Box sx={{ background: 'linear-gradient(120deg, #fdfefeff 0%, #f5f7fa 100%)', borderRadius: 2 }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#d6e7f9ff', color: '#000000ff', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
              <CheckCircleIcon sx={{ color: '#43a047', fontSize: 32, mr: 1 }} />
              Appointment Details
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              <Stack alignItems="center" spacing={1} mb={2}>
                <Chip label={`Reference No: ${selectedAppointment.referenceNo}`} color="primary" variant="filled" sx={{ fontWeight: 700, fontSize: 16 }} />
                <Chip label={selectedAppointment.status} color={selectedAppointment.status === 'Cancelled' ? 'default' : selectedAppointment.status === 'Confirmed' ? 'success' : 'warning'} sx={{ fontWeight: 700, fontSize: 15 }} />
              </Stack>
              {/* Doctor Details */}
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#e3f0ff' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}><LocalHospitalIcon sx={{ mr: 1, mb: -0.5 }} />Doctor Details</Typography>
                <Typography><b>Name:</b> {selectedAppointment.doctorName || selectedAppointment.doctorId}</Typography>
              </Box>
              {/* Person Details */}
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#f5f7fa' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}><PersonIcon sx={{ mr: 1, mb: -0.5 }} />Patient Details</Typography>
                <Typography><b>Name:</b> {selectedAppointment.patientName}</Typography>
                <Typography><b>Email:</b> {selectedAppointment.patientEmail || 'N/A'}</Typography>
                <Typography><b>Phone:</b> {selectedAppointment.patientPhone}</Typography>
                <Typography><b>NIC:</b> {selectedAppointment.patientNIC || 'N/A'}</Typography>
                <Typography><b>Passport:</b> {selectedAppointment.patientPassport || 'N/A'}</Typography>
              </Box>
              {/* Scheduled Date and Time */}
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#e3f0ff' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}><CalendarMonthIcon sx={{ mr: 1, mb: -0.5 }} />Scheduled Date & Time</Typography>
                <Typography><b>Date:</b> {selectedAppointment.date}</Typography>
                <Typography><b>Time:</b> {selectedAppointment.startTime} - {selectedAppointment.endTime}</Typography>
                <Typography><b>Queue No:</b> {selectedAppointment.queueNo}</Typography>
                <Typography><b>Reason:</b> {selectedAppointment.reason || 'N/A'}</Typography>
              </Box>
              {/* Payment Details */}
              <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#f5f7fa' }}>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 1 }}><CreditCardIcon sx={{ mr: 1, mb: -0.5 }} />Payment Details</Typography>
                <Typography><b>Payment Method:</b> {selectedAppointment.paymentMethod}</Typography>
                <Typography><b>Total Paid:</b> <span style={{ color: '#388e3c', fontWeight: 600 }}>Rs. {selectedAppointment.priceLkr?.toLocaleString()}</span></Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ background: '#f5f7fa', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
              <Button onClick={() => setDetailsDialogOpen(false)} variant="contained" color="primary" sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}>Close</Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
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
                            onClick={() => {
                              setAppointmentToDelete(a);
                              setDeleteApptDialogOpen(true);
                            }}
                            disabled={a.status === 'Cancelled'}
                          >
                            <DeleteIcon />
                          </IconButton>
                          {/* <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            disabled={a.status === 'Cancelled'}
                            onClick={() => handleCancelAppointment(a._id)}
                          >
                            Cancel
                          </Button> */}
      {/* Delete Appointment Dialog */}
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
      {/* Edit/Reschedule Appointment Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reschedule Appointment</DialogTitle>
        <DialogContent>
          {editAppointment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Date"
                  type="date"
                  value={editAppointment.date || ''}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={editAppointment.startTime || ''}
                  onChange={e => setEditAppointment({ ...editAppointment, startTime: e.target.value })}
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
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </CardContent>

          {/* MERGED ACTIONS */}
          <CardActions sx={{ p: 3, pt: 0, justifyContent: 'space-between' }}>
            {editMode ? (
              <>
                {/* Friend's Save / Cancel kept intact */}
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
                {/* LEFT SIDE ACTIONS (your layout) */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  <Button 
                    variant="contained" 
                    onClick={() => setEditMode(true)}
                    startIcon={<EditIcon />}
                    sx={{ borderRadius: 2, px: 3 }}
                  >
                    Edit Profile
                  </Button>

                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => setDeleteDialogOpen(true)}
                    startIcon={<DeleteIcon />}
                    sx={{ borderRadius: 2, px: 3 }}
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

                  {/* NEW: My Lab Reports (from your code) */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/my-reports')}
                    startIcon={<ScienceOutlined />}
                    sx={{ borderRadius: 2, px: 2 }}
                  >
                    My Lab Reports
                  </Button>
                </Box>

                                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/appointments')}
                    startIcon={<CalendarMonthIcon />}
                    sx={{ borderRadius: 2, px: 3 }}
                  >
                    Book Appointments
                  </Button>

                {/* RIGHT SIDE ACTION (friend's Health Packages) */}
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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
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

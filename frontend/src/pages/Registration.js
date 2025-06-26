import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem, Select,
  InputLabel, FormControl, Grid, Paper, Avatar, Snackbar, Alert
} from '@mui/material';
import { PersonAddAlt1 } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const specialties = [
  "MBBS", "Cardiologist", "Endocrinologist", "Nephrologist", "Gastroenterologist",
  "Pulmonologist / Chest Physician", "Neurologist", "Rheumatologist", "Infectious Disease Physician",
  "Haematologist", "Oncologist", "Dermatologist", "Allergist / Immunologist",
  "Geriatrician", "Hepatologist"
];

export default function Registration() {
  const navigate = useNavigate();

  const [role, setRole] = useState('');
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', nicNumber: '', gender: '', age: '', photo: null,
    address: '', contactNumber: '', dateOfBirth: '', password: '', email: '',
    slmcRegistrationNumber: '', specialty: '', pharmacistId: '',
  });

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setFormData({
      firstName: '', lastName: '', nicNumber: '', gender: '', age: '', photo: null,
      address: '', contactNumber: '', dateOfBirth: '', password: '', email: '',
      slmcRegistrationNumber: '', specialty: '', pharmacistId: '',
    });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('role', role);
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      const res = await axios.post('http://localhost:5000/api/auth/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showAlert('success', `✅ Registered successfully. Your User ID: ${res.data.userId}`);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      showAlert('error', err.response?.data?.message || '❌ Registration failed');
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '100vh', backgroundColor: '#f4f7fb' }}>
      <Grid item xs={11} md={6} component={Paper} elevation={4} sx={{ p: 4, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
            <PersonAddAlt1 />
          </Avatar>
          <Typography variant="h5" fontWeight={600}>Register New Account</Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-label">Select Account Type</InputLabel>
          <Select labelId="role-label" value={role} label="Select Account Type" onChange={handleRoleChange}>
            <MenuItem value="Patient">Patient</MenuItem>
            <MenuItem value="Doctor">Doctor</MenuItem>
            <MenuItem value="Pharmacist">Pharmacist</MenuItem>
            <MenuItem value="HospitalManager">Hospital Manager</MenuItem>
          </Select>
        </FormControl>

        {role && (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField fullWidth required label="Email" name="email" type="email" value={formData.email} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required label="NIC Number" name="nicNumber" value={formData.nicNumber} onChange={handleChange} sx={{ mb: 2 }} />

            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel id="gender-label">Gender</InputLabel>
              <Select labelId="gender-label" name="gender" value={formData.gender} onChange={handleChange}>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth required label="Age" name="age" type="number" value={formData.age} onChange={handleChange} sx={{ mb: 2 }} />

            <Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }}>
              Upload Photo
              <input hidden accept="image/*" type="file" name="photo" onChange={handleChange} />
            </Button>
            {formData.photo && (
              <Typography variant="body2" sx={{ mb: 2 }}>{formData.photo.name}</Typography>
            )}

            <TextField fullWidth required label="Address" name="address" value={formData.address} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required type="date" label="Date of Birth" name="dateOfBirth" InputLabelProps={{ shrink: true }} value={formData.dateOfBirth} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField fullWidth required type="password" label="Password" name="password" value={formData.password} onChange={handleChange} sx={{ mb: 2 }} />

            {role === 'Doctor' && (
              <>
                <TextField fullWidth required label="SLMC Registration Number" name="slmcRegistrationNumber" value={formData.slmcRegistrationNumber} onChange={handleChange} sx={{ mb: 2 }} />
                <FormControl fullWidth required sx={{ mb: 2 }}>
                  <InputLabel id="specialty-label">Specialty</InputLabel>
                  <Select labelId="specialty-label" name="specialty" value={formData.specialty} onChange={handleChange}>
                    {specialties.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {role === 'Pharmacist' && (
              <TextField fullWidth required label="Pharmacist ID" name="pharmacistId" value={formData.pharmacistId} onChange={handleChange} sx={{ mb: 2 }} />
            )}

            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>
              Register
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate('/')}>
              Back to Login
            </Button>
          </Box>
        )}
      </Grid>

      {/* Stylish Alert Box */}
      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
}

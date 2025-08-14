// src/pages/Registration.js
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

const initialForm = {
  firstName: '', lastName: '', nicNumber: '', gender: '', age: '', photo: null,
  address: '', contactNumber: '', dateOfBirth: '', password: '', confirmPassword: '', email: '',
  slmcRegistrationNumber: '', specialty: '', pharmacistId: ''
};

export default function Registration() {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleRoleChange = (e) => {
    setRole(e.target.value);
    setFormData(initialForm);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const nameRegex = /^[A-Za-z]+$/;
    const nicRegexOld = /^\d{9}[vV]$/;
    const nicRegexNew = /^\d{12}$/;
    const contactRegex = /^0\d{9}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!]).{8,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Common validations
    if (!formData.email || !emailRegex.test(formData.email)) newErrors.email = 'Valid email required';
    if (!formData.firstName || !nameRegex.test(formData.firstName)) newErrors.firstName = 'Only letters allowed';
    if (!formData.lastName || !nameRegex.test(formData.lastName) || formData.lastName === formData.firstName)
      newErrors.lastName = 'Only letters, cannot be same as First Name';
    if (!formData.nicNumber || (!nicRegexOld.test(formData.nicNumber) && !nicRegexNew.test(formData.nicNumber)))
      newErrors.nicNumber = 'Invalid NIC format';
    if (!formData.gender) newErrors.gender = 'Gender required';
    if (!formData.age || +formData.age < 1 || +formData.age > 120) newErrors.age = 'Age must be between 1-120';
    if (!formData.address) newErrors.address = 'Address required';
    if (!contactRegex.test(formData.contactNumber)) newErrors.contactNumber = 'Must be 10 digits, start with 0';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'DOB required';
    if (!passwordRegex.test(formData.password)) newErrors.password = 'Min 8 chars, 1 uppercase, 1 number, 1 special char';
    if (formData.confirmPassword !== formData.password) newErrors.confirmPassword = 'Passwords do not match';

    // Role-specific
    if (role === 'Doctor') {
      if (!formData.slmcRegistrationNumber || !/^\d{5}$/.test(formData.slmcRegistrationNumber))
        newErrors.slmcRegistrationNumber = 'Must be 5 digits';
      if (!formData.specialty) newErrors.specialty = 'Specialty required';
    }

    if (role === 'Pharmacist' && !formData.pharmacistId)
      newErrors.pharmacistId = 'Pharmacist ID required';

    // LabAdmin currently has no extra required fields

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const data = new FormData();
      data.append('role', role);
      Object.entries(formData).forEach(([key, val]) => {
        if (val) data.append(key, val);
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
          <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}><PersonAddAlt1 /></Avatar>
          <Typography variant="h5" fontWeight={600}>Register New Account</Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="role-label">Select Account Type</InputLabel>
          <Select labelId="role-label" value={role} label="Select Account Type" onChange={handleRoleChange}>
            <MenuItem value="Patient">Patient</MenuItem>
            <MenuItem value="Doctor">Doctor</MenuItem>
            <MenuItem value="Pharmacist">Pharmacist</MenuItem>
            <MenuItem value="HospitalManager">Hospital Manager</MenuItem>
            <MenuItem value="LabAdmin">Lab Admin</MenuItem> {/* ✅ Added */}
          </Select>
        </FormControl>

        {role && (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {[
              ['email', 'Email', 'email'],
              ['firstName', 'First Name'],
              ['lastName', 'Last Name'],
              ['nicNumber', 'NIC Number'],
              ['address', 'Address'],
              ['contactNumber', 'Contact Number'],
              ['password', 'Password', 'password'],
              ['confirmPassword', 'Confirm Password', 'password'],
            ].map(([name, label, type = 'text']) => (
              <TextField key={name} fullWidth required label={label} name={name}
                value={formData[name]} onChange={handleChange}
                type={type} error={!!errors[name]} helperText={errors[name]} sx={{ mb: 2 }} />
            ))}

            <FormControl fullWidth required sx={{ mb: 2 }} error={!!errors.gender}>
              <InputLabel>Gender</InputLabel>
              <Select name="gender" value={formData.gender} onChange={handleChange} label="Gender">
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
              <Typography color="error" fontSize={12}>{errors.gender}</Typography>
            </FormControl>

            <TextField fullWidth required label="Age" name="age" type="number"
              value={formData.age} onChange={handleChange}
              error={!!errors.age} helperText={errors.age} sx={{ mb: 2 }} />

            <TextField fullWidth required type="date" label="Date of Birth"
              name="dateOfBirth" InputLabelProps={{ shrink: true }}
              value={formData.dateOfBirth} onChange={handleChange}
              error={!!errors.dateOfBirth} helperText={errors.dateOfBirth} sx={{ mb: 2 }} />

            <Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }}>
              Upload Photo
              <input hidden accept="image/*" type="file" name="photo" onChange={handleChange} />
            </Button>
            {formData.photo && (
              <Typography variant="body2" sx={{ mb: 2 }}>{formData.photo.name}</Typography>
            )}

            {role === 'Doctor' && (
              <>
                <TextField fullWidth required label="SLMC Registration Number"
                  name="slmcRegistrationNumber" value={formData.slmcRegistrationNumber}
                  onChange={handleChange} error={!!errors.slmcRegistrationNumber}
                  helperText={errors.slmcRegistrationNumber} sx={{ mb: 2 }} />

                <FormControl fullWidth required sx={{ mb: 2 }} error={!!errors.specialty}>
                  <InputLabel>Specialty</InputLabel>
                  <Select name="specialty" value={formData.specialty} onChange={handleChange} label="Specialty">
                    {specialties.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                  <Typography color="error" fontSize={12}>{errors.specialty}</Typography>
                </FormControl>
              </>
            )}

            {role === 'Pharmacist' && (
              <TextField fullWidth required label="Pharmacist ID"
                name="pharmacistId" value={formData.pharmacistId}
                onChange={handleChange} error={!!errors.pharmacistId}
                helperText={errors.pharmacistId} sx={{ mb: 2 }} />
            )}

            {/* LabAdmin: no extra fields right now */}

            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 1 }}>
              Register
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate('/')}>
              Back to Login
            </Button>
          </Box>
        )}

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>{alert.message}</Alert>
        </Snackbar>
      </Grid>
    </Grid>
  );
}

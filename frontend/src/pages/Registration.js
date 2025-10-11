// src/pages/Registration.js
import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, MenuItem, Select,
  InputLabel, FormControl, Grid, Paper, Avatar, Snackbar, Alert
} from '@mui/material';
import { PersonAddAlt1 } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Registration.css'; // ← NEW: CSS-only styling

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

    if (role === 'Doctor') {
      if (!formData.slmcRegistrationNumber || !/^\d{5}$/.test(formData.slmcRegistrationNumber))
        newErrors.slmcRegistrationNumber = 'Must be 5 digits';
      if (!formData.specialty) newErrors.specialty = 'Specialty required';
    }

    if (role === 'Pharmacist' && !formData.pharmacistId)
      newErrors.pharmacistId = 'Pharmacist ID required';

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
    <Grid container justifyContent="center" alignItems="center" className="reg-bg">
      <Grid item xs={11} md={9} lg={8} component={Paper} elevation={4} className="reg-card">
        {/* Header */}
        <Box className="reg-header">
          <Avatar className="reg-header__avatar"><PersonAddAlt1 /></Avatar>
          <Typography className="reg-header__title">Register your information</Typography>
        </Box>

        {/* Account type */}
        <div className="reg-section">
          <div className="reg-subtitle">Select Account Type</div>

          {/* Keep original <Select> to preserve logic; styled to be invisible but accessible */}
          <FormControl fullWidth className="reg-role-select">
            <InputLabel id="role-label">Select Account Type</InputLabel>
            <Select labelId="role-label" value={role} label="Select Account Type" onChange={handleRoleChange}>
              <MenuItem value="Patient">Patient</MenuItem>
              <MenuItem value="Doctor">Doctor</MenuItem>
              <MenuItem value="Pharmacist">Pharmacist</MenuItem>
              <MenuItem value="HospitalManager">Hospital Manager</MenuItem>
              <MenuItem value="LabAdmin">Lab Admin</MenuItem>
            </Select>
          </FormControl>

          {/* Visual tiles mapped to the same handler for 1:1 behavior */}
          <div className="role-tiles">
            {[
              { v: 'Patient', label: 'Patient', icon: '👤' },
              { v: 'Doctor', label: 'Doctor', icon: '➕' },
              { v: 'Pharmacist', label: 'Pharmacist', icon: '💊' },
              { v: 'HospitalManager', label: 'Hospital Manager', icon: '🏥' },
              { v: 'LabAdmin', label: 'LabAdmin', icon: '⚗️' },
            ].map(t => (
              <button
                key={t.v}
                type="button"
                className={`role-tiles__item ${role === t.v ? 'is-active' : ''}`}
                onClick={() => handleRoleChange({ target: { value: t.v } })}
              >
                <span className="role-tiles__icon" aria-hidden>{t.icon}</span>
                <span className="role-tiles__text">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        {role && (
          <Box component="form" onSubmit={handleSubmit} noValidate className="reg-form">
            <div className="reg-subtitle">Personal Information</div>

            {/* Two-column grid aligned to the design */}
            <div className="reg-grid">
              {/* LEFT column */}
              <div className="col">
                <TextField fullWidth required label="First Name *" name="firstName"
                  value={formData.firstName} onChange={handleChange}
                  error={!!errors.firstName} helperText={errors.firstName} className="fld" />

                <TextField fullWidth required label="Nic number*" name="nicNumber"
                  value={formData.nicNumber} onChange={handleChange}
                  error={!!errors.nicNumber} helperText={errors.nicNumber} className="fld" />

                <TextField fullWidth required label="Email address*" name="email" type="email"
                  value={formData.email} onChange={handleChange}
                  error={!!errors.email} helperText={errors.email} className="fld" />

                <TextField fullWidth required label="Age*" name="age" type="number"
                  value={formData.age} onChange={handleChange}
                  error={!!errors.age} helperText={errors.age} className="fld" />

                <TextField fullWidth required label="Password*" name="password" type="password"
                  value={formData.password} onChange={handleChange}
                  error={!!errors.password} helperText={errors.password} className="fld" />

                <TextField fullWidth required label="Confirm Password*" name="confirmPassword" type="password"
                  value={formData.confirmPassword} onChange={handleChange}
                  error={!!errors.confirmPassword} helperText={errors.confirmPassword} className="fld" />
              </div>

              {/* RIGHT column */}
              <div className="col">
                <TextField fullWidth required label="Last Name*" name="lastName"
                  value={formData.lastName} onChange={handleChange}
                  error={!!errors.lastName} helperText={errors.lastName} className="fld" />

                {/* Address with fixed top margin alignment (no big gap) */}
                <TextField fullWidth required label="Address*" name="address" multiline minRows={3}
                  value={formData.address} onChange={handleChange}
                  error={!!errors.address} helperText={errors.address} className="fld fld--address" />

                <TextField fullWidth required type="date" label="Date of birth" name="dateOfBirth"
                  InputLabelProps={{ shrink: true }}
                  value={formData.dateOfBirth} onChange={handleChange}
                  error={!!errors.dateOfBirth} helperText={errors.dateOfBirth} className="fld" />

                <FormControl fullWidth required error={!!errors.gender} className="fld">
                  <InputLabel>Gender</InputLabel>
                  <Select name="gender" value={formData.gender} onChange={handleChange} label="Gender">
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  <Typography className="err" component="div">{errors.gender}</Typography>
                </FormControl>

                <TextField fullWidth required label="Contact Number" name="contactNumber"
                  value={formData.contactNumber} onChange={handleChange}
                  error={!!errors.contactNumber} helperText={errors.contactNumber} className="fld" />

                <div className="upload-row fld">
                  <Button variant="outlined" component="label" className="upload-btn">
                    Upload Photo
                    <input hidden accept="image/*" type="file" name="photo" onChange={handleChange} />
                  </Button>
                  {formData.photo && (
                    <span className="upload-name">{formData.photo.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Role-specific rows (unchanged logic) */}
            {role === 'Doctor' && (
              <div className="role-extra">
                <TextField fullWidth required label="SLMC Registration Number"
                  name="slmcRegistrationNumber" value={formData.slmcRegistrationNumber}
                  onChange={handleChange} error={!!errors.slmcRegistrationNumber}
                  helperText={errors.slmcRegistrationNumber} className="fld role-fld" />

                <FormControl fullWidth required error={!!errors.specialty} className="fld role-fld">
                  <InputLabel>Specialty</InputLabel>
                  <Select name="specialty" value={formData.specialty} onChange={handleChange} label="Specialty">
                    {specialties.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                  <Typography className="err" component="div">{errors.specialty}</Typography>
                </FormControl>
              </div>
            )}

            {role === 'Pharmacist' && (
              <TextField fullWidth required label="Pharmacist ID"
                name="pharmacistId" value={formData.pharmacistId}
                onChange={handleChange} error={!!errors.pharmacistId}
                helperText={errors.pharmacistId} className="fld role-fld" />
            )}

            {/* CTA row exactly like mock */}
            <Button type="submit" variant="contained" color="primary" className="submit-btn">
              Submit
            </Button>

            <button type="button" className="back-link" onClick={() => navigate('/')}>
              Back to Login
            </button>
          </Box>
        )}

        <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity} variant="filled" sx={{ width: '100%' }}>{alert.message}</Alert>
        </Snackbar>
      </Grid>
    </Grid>
  );
}

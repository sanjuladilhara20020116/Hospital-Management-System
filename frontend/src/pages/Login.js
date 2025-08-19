import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Grid, Paper,
  Avatar, Snackbar, Alert
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });

    showAlert('success', '✅ Login successful!');

    // Save user and token
    localStorage.setItem('user', JSON.stringify(res.data.user));
    localStorage.setItem('token', res.data.token); // ✅ Token saved

    setTimeout(() => navigate('/dashboard'), 2000);
  } catch (err) {
    showAlert('error', err.response?.data?.message || '❌ Invalid email or password');
  }
};


  return (
    <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '100vh', backgroundColor: '#eef2f7' }}>
      <Grid item xs={11} sm={8} md={4}>
        <Paper elevation={4} sx={{ padding: 4, borderRadius: 3 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
              <LockOutlined />
            </Avatar>
            <Typography variant="h5" mb={2}>Hospital Login</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />

            <Button variant="contained" type="submit" fullWidth sx={{ mt: 2 }}>
              Sign In
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate('/register')}>
              Create New Account
            </Button>
          </Box>
        </Paper>
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

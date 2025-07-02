// src/pages/HospitalManagerDashboard.js
import React from 'react';
import { Box, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function HospitalManagerDashboard() {
  const navigate = useNavigate();

  return (
    <Box display="flex">
      <Sidebar role="HospitalManager" />

      <Box flexGrow={1} p={3}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Hospital Manager Dashboard
        </Typography>

        <Grid container spacing={3} mt={2}>
          {/* Ward Management Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={4} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ward Management
              </Typography>
              <Typography variant="body2" gutterBottom>
                View, create, and manage hospital wards and assign patients to available beds.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/wards')}
                sx={{ mt: 2 }}
              >
                Go to Ward Management
              </Button>
            </Paper>
          </Grid>

          {/* Department Management Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={4} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Department Management
              </Typography>
              <Typography variant="body2" gutterBottom>
                Add, update, and organize departments within your hospital.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate('/departments')}
                sx={{ mt: 2 }}
              >
                Go to Department Management
              </Button>
            </Paper>
          </Grid>

          {/* You can add more manager-specific features below */}
        </Grid>
      </Box>
    </Box>
  );
}

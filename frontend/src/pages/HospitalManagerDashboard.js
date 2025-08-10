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

          {/* Supplier Management Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={4} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Health Care Inventory Management
              </Typography>
              <Button
                variant="contained"
                color="success"
                onClick={() => navigate('/supplier-management')}
                sx={{ mt: 2 }}
              >
                Go to Health Care Inventory Management
              </Button>
            </Paper>
          </Grid>

          {/* Health Care Packages Management Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={4} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Health Care Packages Management
              </Typography>
              <Typography variant="body2" gutterBottom>
                Add, update, or delete medical check-up packages offered by the hospital.
              </Typography>
              <Button
                variant="contained"
                color="warning"
                onClick={() => navigate('/manager-packages')}
                sx={{ mt: 2 }}
              >
                Manage Health Care Packages
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

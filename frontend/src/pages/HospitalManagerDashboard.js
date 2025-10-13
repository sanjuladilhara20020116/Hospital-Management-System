// src/pages/HospitalManagerDashboard.js
import React from 'react';
import { Box, Typography, Button, Grid, Paper, Divider, useTheme, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function HospitalManagerDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box display="flex" sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <Sidebar role="HospitalManager" />

      <Box flexGrow={1} sx={{ position: 'relative' }}>
        {/* Soft page background */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(900px 500px at 110% -10%, ${theme.palette.primary.main}12, transparent 60%),
              radial-gradient(700px 380px at -10% 20%, ${theme.palette.success.main}10, transparent 55%),
              ${theme.palette.background.default}
            `,
            pointerEvents: 'none'
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 3, md: 4 } }}>
          {/* Sticky header */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              mb: 3,
              py: 2,
              backdropFilter: 'blur(8px)',
              backgroundColor: theme.palette.background.paper + 'cc',
              borderBottom: `1px solid ${theme.palette.divider}`,
              borderRadius: { xs: 0, md: 2 },
              px: { xs: 2, md: 3 },
              boxShadow: '0 6px 18px rgba(2,6,23,.06)'
            }}
          >
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                m: 0,
                letterSpacing: '.2px',
                backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.success.main})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Hospital Manager Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              Quick links to manage wards, departments, inventory, and health care packages
            </Typography>
          </Box>

          <Grid container spacing={3} mt={0}>
            {/* Ward Management */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(2,6,23,.06)',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 16px 34px rgba(2,6,23,.10)',
                    borderColor: theme.palette.primary.main
                  }
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Operations</Typography>
                  <Typography variant="h6" fontWeight={700}>Ward Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Create and update wards, bed counts, and allocations.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/wards')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Go to Ward Management
                </Button>
              </Paper>
            </Grid>

            {/* Department Management */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(2,6,23,.06)',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 16px 34px rgba(2,6,23,.10)',
                    borderColor: theme.palette.secondary.main
                  }
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Structure</Typography>
                  <Typography variant="h6" fontWeight={700}>Department Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Manage departments, services, and staff assignments.
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate('/departments')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Go to Department Management
                </Button>
              </Paper>
            </Grid>

            {/* Health Care Inventory Management */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(2,6,23,.06)',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 16px 34px rgba(2,6,23,.10)',
                    borderColor: theme.palette.success.main
                  }
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Supplies</Typography>
                  <Typography variant="h6" fontWeight={700}>Health Care Inventory Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Oversee suppliers, stock levels, and purchase orders.
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => navigate('/supplier-management')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Go to Health Care Inventory Management
                </Button>
              </Paper>
            </Grid>

            {/* Health Care Packages Management */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(2,6,23,.06)',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 16px 34px rgba(2,6,23,.10)',
                    borderColor: theme.palette.warning.main
                  }
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Services</Typography>
                  <Typography variant="h6" fontWeight={700}>Health Care Packages Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Add, update, or delete medical check-up packages offered by the hospital.
                </Typography>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => navigate('/manager-packages')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Manage Health Care Packages
                </Button>
              </Paper>
            </Grid>

            {/* ✅ NEW: Vaccination Management (Doctor Vaccinations list, for Managers) */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: '0 10px 30px rgba(2,6,23,.06)',
                  transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 16px 34px rgba(2,6,23,.10)',
                    borderColor: theme.palette.info.main
                  }
                }}
              >
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Clinical</Typography>
                  <Typography variant="h6" fontWeight={700}>Vaccination Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Review vaccination records, open certificates, and resend emails.
                </Typography>
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => navigate('/vaccinations/doctor')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Open Vaccination Records
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

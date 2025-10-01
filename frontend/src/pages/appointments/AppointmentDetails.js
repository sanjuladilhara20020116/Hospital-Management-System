
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Stack, Divider, Button, Avatar, Grid, Chip, Tooltip } from "@mui/material";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { generateAppointmentPDF } from '../../utils/pdfUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DescriptionIcon from '@mui/icons-material/Description';

export default function AppointmentDetails() {
  const location = useLocation();
  const navigate = useNavigate();       // if the user reloads or comes here directly you don’t have data you show an error and a Back button
  const appointment = location.state?.appointment;
//No appointment details found
  if (!appointment) {
    return (
      <Box p={4}>           
        <Typography variant="h5" color="error">No appointment details found.</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(-1)}>Back</Button>
      </Box>
    );
  }

  const handleGeneratePDF = () => {
    generateAppointmentPDF(appointment);
  };//pdf generate code ekata call karala

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(120deg, #e3f0ff 0%, #f5f7fa 100%)', py: 7, px: { xs: 2, md: 6 } }}>
      {/* Top row: Home and Check Appointments buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600, borderRadius: 2, px: 4, fontSize: 15, boxShadow: 2 }}
          onClick={() => navigate('/')}
        >
          Go to Homepage
        </Button>
        <Button
          variant="outlined"
          color="primary"
          sx={{ fontWeight: 600, borderRadius: 2, px: 4, fontSize: 15, boxShadow: 2 }}//this code is appo.comfirm.gotohome page button
          onClick={() => navigate('/login')}
        >
          Check Your Appointments
        </Button>
      </Box>                    
      <Paper elevation={6} sx={{ maxWidth: 950, mx: 'auto', p: { xs: 2, md: 5 }, borderRadius: 5, background: '#fff', boxShadow: '0 8px 32px 0 rgba(60,60,100,0.10)' }}>
        <Stack alignItems="center" spacing={2}>
          <CheckCircleIcon sx={{ color: '#43a047', fontSize: 60, mb: 1 }} />   
          <Typography variant="h3" fontWeight={800} color="#1976d2" gutterBottom letterSpacing={1} marginLeft={-155}>
            Appointment Confirmed
          </Typography>
          <Chip label={`Reference No: ${appointment.referenceNo}`} color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: 16, mb: 1 }} />
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Grid container spacing={3} marginLeft={7}>
          {/* Left column */}
          <Grid item xs={12} md={6} marginRight={14}>
            <Box display="flex">
              <Box display="flex" flexDirection="column" pr={2} minWidth={140}>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><LocalHospitalIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Doctor:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><CalendarMonthIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Date:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><AccessTimeIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Time:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><AssignmentIndIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>NIC:</Typography></Box>
                <Box display="flex" alignItems="center" sx={{ minHeight: 36 }}><AssignmentIndIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Passport:</Typography></Box>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-start">
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.doctorName || appointment.doctorId}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.date}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.startTime} - {appointment.endTime}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.patientNIC || 'N/A'}</Typography>
                <Typography variant="subtitle1" sx={{ minHeight: 36 }}>{appointment.patientPassport || 'N/A'}</Typography>
              </Box>
            </Box>   
          </Grid>
          {/* Right column */}
          <Grid item xs={12} md={6}>
            <Box display="flex">
              <Box display="flex" flexDirection="column" pr={2} minWidth={160}>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><PersonIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Patient:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><PhoneIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Phone:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><EmailIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Email:</Typography></Box>
                <Box display="flex" alignItems="center" mb={2} sx={{ minHeight: 36 }}><CreditCardIcon color="primary" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Payment:</Typography></Box>
                <Box display="flex" alignItems="center" sx={{ minHeight: 36 }}><DescriptionIcon color="info" sx={{ mr: 1 }} /><Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90 }}>Reason:</Typography></Box>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-start">
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.patientName}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.patientPhone}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.patientEmail || 'N/A'}</Typography>
                <Typography variant="subtitle1" mb={2} sx={{ minHeight: 36 }}>{appointment.paymentMethod}</Typography>
                <Typography variant="subtitle1" sx={{ minHeight: 36 }}>{appointment.reason || 'N/A'}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={2} alignItems="center">
          <Typography variant="body1" color="#388e3c" sx={{ mb: 1, fontWeight: 600, fontSize: 18 }}>
            <b color="#024906ff">Total Paid:</b> Rs. {appointment.priceLkr?.toLocaleString()}
          </Typography>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleGeneratePDF}
            sx={{ fontWeight: 700, borderRadius: 2, px: 4, fontSize: 18, boxShadow: 2, backgroundColor: '#1e4c7aff', '&:hover': { backgroundColor: '#115293' } }}
          >
            Generate PDF
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
//pdf generate code ekata call karala 32-34
// Check Your Appointments 54
// No appointment details found 22
//CheckCircleIcon 59
//displays the amount paid 108-110
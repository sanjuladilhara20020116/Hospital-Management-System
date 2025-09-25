// src/pages/appointments/PaymentSuccess.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';

export default function PaymentSuccess() {
  const nav = useNavigate();
  const { state } = useLocation();
  const appt = state?.appt;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', mt: 6 }}>
      <Typography variant="h4" fontWeight={800} color="success.main">Payment Successful</Typography>
      {appt ? (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography>Reference: <b>{appt.referenceNo}</b></Typography>
          <Typography>Date: {appt.date}</Typography>
          <Typography>Time: {appt.startTime} – {appt.endTime}</Typography>
          <Typography>Status: {appt.status}</Typography>
          <Typography>Queue No (Appointment No): <b>{appt.queueNo}</b></Typography>
        </Stack>
      ) : (
        <Typography sx={{ mt: 2 }}>Appointment confirmed.</Typography>
      )}
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="contained" onClick={() => nav('/dashboard')}>Go to Dashboard</Button>
        <Button variant="text" onClick={() => nav('/appointments')}>Book another</Button>
      </Stack>
    </Box>
  );
}

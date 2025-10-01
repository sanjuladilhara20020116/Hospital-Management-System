import React from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export default function PatientDetailsPlaceholder() {
  const { patientId } = useParams();
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={800}>Patient Details</Typography>
      <Typography sx={{ mt: 1 }} color="text.secondary">
        Patient ID: {decodeURIComponent(patientId)}
      </Typography>
    </Box>
  );
}

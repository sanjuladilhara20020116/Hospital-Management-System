import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button, Divider, Stack
} from "@mui/material";

// Tiny date formatter => "YYYY-MM-DD HH:mm"
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function PrescriptionViewDialog({ item, onClose }) {
  if (!item) return null;

  const tfCommon = { fullWidth: true, InputLabelProps: { shrink: true }, InputProps: { readOnly: true } };

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>View Prescription</DialogTitle>
      <DialogContent dividers>
        {/* IDs / parties / date */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Prescription ID" value={item.prescriptionId || ""} {...tfCommon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Date & Time" value={fmtDate(item.visitDateTime)} {...tfCommon} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField label="Patient ID" value={item.patientUserId || ""} {...tfCommon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Patient Name" value={item.patientName || ""} {...tfCommon} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField label="Age" value={item.age ?? ""} {...tfCommon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Doctor ID" value={item.doctorUserId || ""} {...tfCommon} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField label="Doctor Name" value={item.doctorName || ""} {...tfCommon} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Clinical details stacked */}
        <Stack spacing={2}>
          <TextField label="Chief complaint" value={item.chiefComplaint || ""} {...tfCommon} multiline minRows={2} />
          <TextField label="Medicine Name and dosage" value={item.medicines || ""} {...tfCommon} multiline minRows={5} />
          <TextField label="Instructions" value={item.instructions || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Duration" value={item.duration || ""} {...tfCommon} />
          <TextField label="Requested lab reports" value={item.requestedLabReports || ""} {...tfCommon} multiline minRows={2} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

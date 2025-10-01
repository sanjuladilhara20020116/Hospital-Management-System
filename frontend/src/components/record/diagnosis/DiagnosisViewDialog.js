import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button, Divider, Stack
} from "@mui/material";

// "YYYY-MM-DD HH:mm"
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DiagnosisViewDialog({ item, onClose }) {
  if (!item) return null;

  const tfCommon = { fullWidth: true, InputLabelProps: { shrink: true }, InputProps: { readOnly: true } };

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>View Diagnosis Card</DialogTitle>
      <DialogContent dividers>
        {/* IDs / parties / date in two columns */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="DiagnosisCard ID" value={item.diagnosisCardId || ""} {...tfCommon} />
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

        {/* Clinical details stacked like the form */}
        <Stack spacing={2}>
          <TextField label="Preliminary Diagnosis" value={item.preliminaryDiagnosis || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Final Diagnosis" value={item.finalDiagnosis || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Related symptoms" value={item.relatedSymptoms || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Cause / Risk factors" value={item.riskFactors || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Lifestyle advice" value={item.lifestyleAdvice || ""} {...tfCommon} multiline minRows={3} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

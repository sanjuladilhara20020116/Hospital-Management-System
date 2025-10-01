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

export default function AdmissionViewDialog({ item, onClose }) {
  if (!item) return null;

  const tfCommon = { fullWidth: true, InputLabelProps: { shrink: true }, InputProps: { readOnly: true } };

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>View Admission Note</DialogTitle>
      <DialogContent dividers>
        {/* IDs / parties / date */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="AdmissionNote ID" value={item.admissionNoteId || ""} {...tfCommon} />
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

        {/* Clinical fields stacked like the form */}
        <Stack spacing={2}>
          <TextField label="Chife complaint" value={item.chiefComplaint || ""} {...tfCommon} multiline minRows={2} />
          <TextField label="Preliminary Diagnosis" value={item.preliminaryDiagnosis || ""} {...tfCommon} multiline minRows={2} />
          <TextField label="Recommended ward/unit" value={item.recommendedUnit || ""} {...tfCommon} />
          <TextField label="Present symptoms" value={item.presentSymptoms || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Examination Findings" value={item.examinationFindings || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Existing conditions" value={item.existingConditions || ""} {...tfCommon} multiline minRows={2} />
          <TextField label="Immediat Managements" value={item.immediateManagements || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Emergency Medical care" value={item.emergencyCare || ""} {...tfCommon} multiline minRows={3} />
          <TextField label="Doctor Notes" value={item.doctorNotes || ""} {...tfCommon} multiline minRows={3} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

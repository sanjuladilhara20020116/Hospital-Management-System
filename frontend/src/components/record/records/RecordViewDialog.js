// src/components/record/records/RecordViewDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  Divider,
  Stack,
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

export default function RecordViewDialog({ item, onClose }) {
  if (!item) return null;

  // Labels always above inputs + read-only
  const tfCommon = {
    fullWidth: true,
    InputLabelProps: { shrink: true },
    InputProps: { readOnly: true },
  };

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>View Record</DialogTitle>
      <DialogContent dividers>
        {/* 1 → 8: IDs / parties / date (two columns) */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Record ID" value={item.recordId || ""} {...tfCommon} />
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
            <TextField label="Gender" value={item.gender || ""} {...tfCommon} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField label="Doctor ID" value={item.doctorUserId || ""} {...tfCommon} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Doctor Name" value={item.doctorName || ""} {...tfCommon} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* 9 → 15: clinical text blocks stacked (single column, like the form) */}
        <Stack spacing={2}>
          <TextField
            label="Chief complaint / reason for visit"
            value={item.chiefComplaint || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Present symptoms"
            value={item.presentSymptoms || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Examination / Observation"
            value={item.examination || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Assessment / Impression"
            value={item.assessment || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Instructions"
            value={item.instructions || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Vital signs"
            value={item.vitalSigns || ""}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Doctor notes"
            value={item.doctorNotes || ""}
            {...tfCommon}
            multiline
            minRows={3}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

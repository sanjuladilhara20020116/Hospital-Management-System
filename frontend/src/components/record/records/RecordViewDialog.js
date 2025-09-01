import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button
} from "@mui/material";
import dayjs from "dayjs";

export default function RecordViewDialog({ item, onClose }) {
  if (!item) return null;

  const ro = (label, value) => (
    <TextField label={label} value={value ?? ""} fullWidth InputProps={{ readOnly: true }} />
  );

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>View Record</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>{ro("Record ID", item.recordId)}</Grid>
          <Grid item xs={12} md={6}>{ro("Date & time", dayjs(item.visitDateTime).format("YYYY-MM-DD HH:mm"))}</Grid>

          <Grid item xs={12} md={6}>{ro("Patient ID", item.patientUserId)}</Grid>
          <Grid item xs={12} md={6}>{ro("Patient Name", item.patientName)}</Grid>

          <Grid item xs={12} md={6}>{ro("Age", item.age)}</Grid>
          <Grid item xs={12} md={6}>{ro("Gender", item.gender)}</Grid>

          <Grid item xs={12} md={6}>{ro("Doctor ID", item.doctorUserId)}</Grid>
          <Grid item xs={12} md={6}>{ro("Doctor Name", item.doctorName)}</Grid>

          <Grid item xs={12}>{ro("Chief complaint / reason for visit", item.chiefComplaint)}</Grid>
          <Grid item xs={12}>{ro("Present symptoms", item.presentSymptoms)}</Grid>
          <Grid item xs={12}>{ro("Examination / Observation", item.examination)}</Grid>
          <Grid item xs={12}>{ro("Assessment / Impression", item.assessment)}</Grid>
          <Grid item xs={12}>{ro("Instructions", item.instructions)}</Grid>
          <Grid item xs={12}>{ro("Vital signs", item.vitalSigns)}</Grid>
          <Grid item xs={12}>{ro("Doctor notes", item.doctorNotes)}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

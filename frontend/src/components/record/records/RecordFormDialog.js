import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Alert
} from "@mui/material";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function RecordFormDialog({
  open,
  onClose,
  patientUserId,
  initialItem,              // if present -> edit mode
  onCreated,
  onUpdated,
}) {
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [form, setForm] = useState({
    chiefComplaint: "",
    presentSymptoms: "",
    examination: "",
    assessment: "",
    instructions: "",
    vitalSigns: "",
    doctorNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isEdit = !!initialItem;
  const viewer = getCurrentUser();

  // load patient + doctor to auto-fill labels/ids
  useEffect(() => {
    if (!open) return;

    (async () => {
      setErr("");
      try {
        const [pRes, dRes] = await Promise.all([
          axios.get(`${API_BASE}/api/users/${encodeURIComponent(patientUserId)}`),
          axios.get(`${API_BASE}/api/users/${encodeURIComponent(viewer?.userId || "")}`)
        ]);
        setPatient(pRes.data || null);
        setDoctor(dRes.data || null);
      } catch (e) {
        setErr("Failed to load patient/doctor info");
      }
    })();
  }, [open, patientUserId, viewer?.userId]);

  useEffect(() => {
    if (isEdit && initialItem) {
      setForm({
        chiefComplaint: initialItem.chiefComplaint || "",
        presentSymptoms: initialItem.presentSymptoms || "",
        examination: initialItem.examination || "",
        assessment: initialItem.assessment || "",
        instructions: initialItem.instructions || "",
        vitalSigns: initialItem.vitalSigns || "",
        doctorNotes: initialItem.doctorNotes || "",
      });
    } else {
      setForm({
        chiefComplaint: "",
        presentSymptoms: "",
        examination: "",
        assessment: "",
        instructions: "",
        vitalSigns: "",
        doctorNotes: "",
      });
    }
  }, [isEdit, initialItem, open]);

  const setVal = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const payload = useMemo(() => {
    if (!patient || !doctor) return null;
    return {
      // auto-fill fields (backend stores them)
      patientUserId: patient.userId,
      patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      age: patient.age ?? undefined,
      gender: patient.gender || undefined,

      doctorUserId: doctor.userId,
      doctorName: `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim(),

      // visitDateTime auto by server for create; for edit we keep existing

      // form fields
      ...form,
    };
  }, [patient, doctor, form]);

  const onSubmit = async () => {
    try {
      setSaving(true);
      setErr("");

      if (!payload) throw new Error("Missing patient/doctor info");

      if (isEdit) {
        const res = await axios.put(
          `${API_BASE}/api/clinical-records/${encodeURIComponent(initialItem._id)}`,
          payload
        );
        onUpdated && onUpdated(res.data.item);
      } else {
        const res = await axios.post(`${API_BASE}/api/clinical-records`, payload);
        onCreated && onCreated(res.data.item);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Record" : "Add Record"}</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {/* Show who/when (read-only auto info) */}
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Patient"
              value={patient ? `${patient.firstName || ""} ${patient.lastName || ""} (${patient.userId})` : ""}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Doctor"
              value={doctor ? `${doctor.firstName || ""} ${doctor.lastName || ""} (${doctor.userId})` : ""}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        {/* Editable fields */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Chief complaint / reason for visit"
              value={form.chiefComplaint} onChange={setVal("chiefComplaint")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Present symptoms"
              value={form.presentSymptoms} onChange={setVal("presentSymptoms")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Examination / Observation"
              value={form.examination} onChange={setVal("examination")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Assessment / Impression"
              value={form.assessment} onChange={setVal("assessment")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Instructions"
              value={form.instructions} onChange={setVal("instructions")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Vital signs"
              value={form.vitalSigns} onChange={setVal("vitalSigns")} fullWidth multiline />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Doctor notes"
              value={form.doctorNotes} onChange={setVal("doctorNotes")} fullWidth multiline />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Back</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

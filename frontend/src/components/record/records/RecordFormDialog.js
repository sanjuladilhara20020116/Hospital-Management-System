// src/components/record/records/RecordFormDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Alert, Divider, Stack
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

  // Convenience props so labels are always shown above inputs
  const tfCommon = {
    fullWidth: true,
    InputLabelProps: { shrink: true },
  };

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

  // initialize form for edit/create
  useEffect(() => {
    if (!open) return;
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
      // auto-fill fields stored by backend
      patientUserId: patient.userId,
      patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      age: patient.age ?? undefined,
      gender: patient.gender || undefined,

      doctorUserId: doctor.userId,
      doctorName: `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim(),

      // visitDateTime: backend default at create

      // editable form fields
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

        {/* Patient / Doctor details (labels above inputs) */}
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Patient"
              value={patient ? `${patient.firstName || ""} ${patient.lastName || ""} (${patient.userId})` : ""}
              {...tfCommon}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Doctor"
              value={doctor ? `${doctor.firstName || ""} ${doctor.lastName || ""} (${doctor.userId})` : ""}
              {...tfCommon}
              InputProps={{ readOnly: true }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {/* Editable fields stacked one by one with labels always on top */}
        <Stack spacing={2}>
          <TextField
            label="Chief complaint / reason for visit"
            value={form.chiefComplaint}
            onChange={setVal("chiefComplaint")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Present symptoms"
            value={form.presentSymptoms}
            onChange={setVal("presentSymptoms")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Examination / Observation"
            value={form.examination}
            onChange={setVal("examination")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Assessment / Impression"
            value={form.assessment}
            onChange={setVal("assessment")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Instructions"
            value={form.instructions}
            onChange={setVal("instructions")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Vital signs"
            value={form.vitalSigns}
            onChange={setVal("vitalSigns")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Doctor notes"
            value={form.doctorNotes}
            onChange={setVal("doctorNotes")}
            {...tfCommon}
            multiline
            minRows={3}
          />
        </Stack>
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

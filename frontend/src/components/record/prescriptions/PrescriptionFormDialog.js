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

export default function PrescriptionFormDialog({
  open,
  onClose,
  patientUserId,
  initialItem,              // edit mode if present
  onCreated,
  onUpdated,
}) {
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [form, setForm] = useState({
    chiefComplaint: "",
    medicines: "",
    instructions: "",
    requestedLabReports: "",
    duration: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isEdit = !!initialItem;
  const viewer = getCurrentUser();

  const tfCommon = { fullWidth: true, InputLabelProps: { shrink: true } };

  // Load auto-fill info
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

  // Initialize form
  useEffect(() => {
    if (!open) return;
    if (isEdit && initialItem) {
      setForm({
        chiefComplaint: initialItem.chiefComplaint || "",
        medicines: initialItem.medicines || "",
        instructions: initialItem.instructions || "",
        requestedLabReports: initialItem.requestedLabReports || "",
        duration: initialItem.duration || "",
      });
    } else {
      setForm({
        chiefComplaint: "",
        medicines: "",
        instructions: "",
        requestedLabReports: "",
        duration: "",
      });
    }
  }, [isEdit, initialItem, open]);

  const setVal = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const payload = useMemo(() => {
    if (!patient || !doctor) return null;
    return {
      patientUserId: patient.userId,
      patientName: `${patient.firstName || ""} ${patient.lastName || ""}`.trim(),
      age: patient.age ?? undefined,

      doctorUserId: doctor.userId,
      doctorName: `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim(),

      // Date auto-filled by backend

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
          `${API_BASE}/api/prescriptions/${encodeURIComponent(initialItem._id)}`,
          payload
        );
        onUpdated && onUpdated(res.data.item);
      } else {
        const res = await axios.post(`${API_BASE}/api/prescriptions`, payload);
        onCreated && onCreated(res.data.item);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to save prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Prescription" : "Add Prescription"}</DialogTitle>
      <DialogContent dividers>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {/* Patient / Doctor auto details */}
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

        {/* Editable fields (stacked, with labels above) */}
        <Stack spacing={2}>
          <TextField
            label="Chief complaint"
            value={form.chiefComplaint}
            onChange={setVal("chiefComplaint")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Medicine Name and dosage"
            value={form.medicines}
            onChange={setVal("medicines")}
            {...tfCommon}
            multiline
            minRows={5} // more space
            placeholder="e.g., Amoxicillin 500 mg — 1 capsule three times daily"
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
            label="Requested lab reports"
            value={form.requestedLabReports}
            onChange={setVal("requestedLabReports")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Duration"
            value={form.duration}
            onChange={setVal("duration")}
            {...tfCommon}
            placeholder="e.g., 7 days"
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

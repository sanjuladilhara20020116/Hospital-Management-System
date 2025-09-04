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

// "YYYY-MM-DD HH:mm" (not strictly needed here, kept for consistency)
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

export default function DiagnosisFormDialog({
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
    preliminaryDiagnosis: "",
    finalDiagnosis: "",
    relatedSymptoms: "",
    riskFactors: "",
    lifestyleAdvice: "",
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
        preliminaryDiagnosis: initialItem.preliminaryDiagnosis || "",
        finalDiagnosis: initialItem.finalDiagnosis || "",
        relatedSymptoms: initialItem.relatedSymptoms || "",
        riskFactors: initialItem.riskFactors || "",
        lifestyleAdvice: initialItem.lifestyleAdvice || "",
      });
    } else {
      setForm({
        preliminaryDiagnosis: "",
        finalDiagnosis: "",
        relatedSymptoms: "",
        riskFactors: "",
        lifestyleAdvice: "",
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
          `${API_BASE}/api/diagnosis-cards/${encodeURIComponent(initialItem._id)}`,
          payload
        );
        onUpdated && onUpdated(res.data.item);
      } else {
        const res = await axios.post(`${API_BASE}/api/diagnosis-cards`, payload);
        onCreated && onCreated(res.data.item);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to save diagnosis card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Diagnosis Card" : "Add Diagnosis Card"}</DialogTitle>
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

        {/* Editable fields (stacked, labels on top) */}
        <Stack spacing={2}>
          <TextField
            label="Preliminary Diagnosis"
            value={form.preliminaryDiagnosis}
            onChange={setVal("preliminaryDiagnosis")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Final Diagnosis"
            value={form.finalDiagnosis}
            onChange={setVal("finalDiagnosis")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Related symptoms"
            value={form.relatedSymptoms}
            onChange={setVal("relatedSymptoms")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Cause / Risk factors"
            value={form.riskFactors}
            onChange={setVal("riskFactors")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Lifestyle advice"
            value={form.lifestyleAdvice}
            onChange={setVal("lifestyleAdvice")}
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

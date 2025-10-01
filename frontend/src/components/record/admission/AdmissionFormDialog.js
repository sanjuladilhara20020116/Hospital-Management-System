import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Alert, Divider, Stack, MenuItem
} from "@mui/material";
import axios from "axios";

const API_BASE = "http://localhost:5000";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const WARD_OPTIONS = [
  "General Ward",
  "Surgical Unit",
  "Medical Unit",
  "ICU",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "Orthopedics",
  "ENT",
];

export default function AdmissionFormDialog({
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
    preliminaryDiagnosis: "",
    recommendedUnit: "",
    presentSymptoms: "",
    examinationFindings: "",
    existingConditions: "",
    immediateManagements: "",
    emergencyCare: "",
    doctorNotes: "",
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
        preliminaryDiagnosis: initialItem.preliminaryDiagnosis || "",
        recommendedUnit: initialItem.recommendedUnit || "",
        presentSymptoms: initialItem.presentSymptoms || "",
        examinationFindings: initialItem.examinationFindings || "",
        existingConditions: initialItem.existingConditions || "",
        immediateManagements: initialItem.immediateManagements || "",
        emergencyCare: initialItem.emergencyCare || "",
        doctorNotes: initialItem.doctorNotes || "",
      });
    } else {
      setForm({
        chiefComplaint: "",
        preliminaryDiagnosis: "",
        recommendedUnit: "",
        presentSymptoms: "",
        examinationFindings: "",
        existingConditions: "",
        immediateManagements: "",
        emergencyCare: "",
        doctorNotes: "",
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
          `${API_BASE}/api/admission-notes/${encodeURIComponent(initialItem._id)}`,
          payload
        );
        onUpdated && onUpdated(res.data.item);
      } else {
        const res = await axios.post(`${API_BASE}/api/admission-notes`, payload);
        onCreated && onCreated(res.data.item);
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to save admission note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Admission Note" : "Add Admission Note"}</DialogTitle>
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

        {/* Editable fields (stacked) */}
        <Stack spacing={2}>
          <TextField
            label="Chife complaint"
            value={form.chiefComplaint}
            onChange={setVal("chiefComplaint")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Preliminary Diagnosis"
            value={form.preliminaryDiagnosis}
            onChange={setVal("preliminaryDiagnosis")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            select
            label="Recommended ward/unit"
            value={form.recommendedUnit}
            onChange={setVal("recommendedUnit")}
            {...tfCommon}
          >
            {WARD_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Present symptoms"
            value={form.presentSymptoms}
            onChange={setVal("presentSymptoms")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Examination Findings"
            value={form.examinationFindings}
            onChange={setVal("examinationFindings")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Existing conditions"
            value={form.existingConditions}
            onChange={setVal("existingConditions")}
            {...tfCommon}
            multiline
            minRows={2}
          />
          <TextField
            label="Immediat Managements"
            value={form.immediateManagements}
            onChange={setVal("immediateManagements")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Emergency Medical care"
            value={form.emergencyCare}
            onChange={setVal("emergencyCare")}
            {...tfCommon}
            multiline
            minRows={3}
          />
          <TextField
            label="Doctor Notes"
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


// src/pages/appointments/BookingDialog.jsx
import React, { useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  RadioGroup, FormControlLabel, Radio, MenuItem, Stack, Typography, Alert
} from "@mui/material";
import API from "../../api";
import { rx, nicOrPassportValid } from "../../utils/validators";

const TITLES = ["Mr.", "Ms.", "Mrs.", "Master", "Dr."];

export default function BookingDialog({ open, onClose, doctorId, doctorName, date, session, onBooked }) {
  const [form, setForm] = useState({
    nationality: "LOCAL",
    title: "Mr.",
    name: "",
    phoneCode: "+94",
    phone: "",
    nic: "",
    passport: "",
    email: "",
    address: "",
    ongoingNumber: "YES",
    noShowRefund: false,
    reason: "",
  });
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!open) return false;
    if (!rx.nameSubmit.test(form.name)) return false;                // letters & spaces only
    if (!rx.phone.test(form.phone)) return false;
    if (!nicOrPassportValid(form.nic.trim(), form.passport.trim())) return false;
    if (form.email && !/.+@.+\..+/.test(form.email)) return false;
    if (form.reason && !rx.reason.test(form.reason)) return false;
    return true;
  }, [open, form]);

  const handle = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!canSubmit) {
      setStatus({ type: "error", msg: "Please fix validation errors." });
      return;
    }
    setSubmitting(true);
    setStatus({ type: "", msg: "" });
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user?.userId) throw new Error("Not logged in as Patient");
      // choose a slot startTime inside the selected session (first free slot will be resolved by BE via /slots normally)
      // Here, we’ll open a small slot picker alternative: pick the session start as default
      const startTime = session?.range?.start;
      const payload = {
        patientId: user.userId, // booking as the logged in patient
        doctorId,
        date,
        startTime,
        name: form.name.trim(),
        phone: form.phone.trim(),
        nic: form.nic.trim() || null,
        passport: form.passport.trim() || null,
        email: form.email.trim() || null,
        reason: form.reason.trim(),
      };
      const r = await API.post("/api/appointments", payload);
      onBooked?.(r.data.appointment);
    } catch (e) {
      const msg = e?.response?.data?.message || "Booking failed.";
      setStatus({ type: "error", msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {doctorName} • {date} • {session?.range?.start} → {session?.range?.end}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Complete within <b>09:17</b> (example). Queue no. will be assigned on submit.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <RadioGroup row value={form.nationality} onChange={(e) => handle("nationality", e.target.value)}>
              <FormControlLabel value="LOCAL" control={<Radio />} label="LOCAL" />
              <FormControlLabel value="FOREIGN" control={<Radio />} label="FOREIGN" />
            </RadioGroup>
          </Grid>

          <Grid item xs={3}>
            <TextField select label="Title" fullWidth value={form.title} onChange={(e) => handle("title", e.target.value)}>
              {TITLES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={9}>
            <TextField
              label="Patient's Name"
              fullWidth
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                if (rx.nameLive.test(v)) handle("name", v); // block special characters live
              }}
              helperText={!rx.nameSubmit.test(form.name) ? "Letters & spaces only (2–50)" : " "}
              error={form.name && !rx.nameSubmit.test(form.name)}
            />
          </Grid>

          <Grid item xs={3}>
            <TextField select label="Code" fullWidth value={form.phoneCode} onChange={(e) => handle("phoneCode", e.target.value)}>
              <MenuItem value="+94">+94</MenuItem>
              <MenuItem value="+91">+91</MenuItem>
              <MenuItem value="+1">+1</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={9}>
            <TextField
              label="Phone"
              fullWidth
              value={form.phone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D+/g, "");
                handle("phone", v);
              }}
              helperText={!rx.phone.test(form.phone) ? "Digits only, length 9–12" : " "}
              error={form.phone && !rx.phone.test(form.phone)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="NIC (Required if no Passport)"
              fullWidth
              value={form.nic}
              onChange={(e) => handle("nic", e.target.value)}
              helperText={
                form.nic
                  ? (rx.sriNicNew.test(form.nic) || rx.sriNicOld.test(form.nic) ? " " : "Invalid NIC")
                  : " "
              }
              error={!!form.nic && !(rx.sriNicNew.test(form.nic) || rx.sriNicOld.test(form.nic))}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Passport (Required if no NIC)"
              fullWidth
              value={form.passport}
              onChange={(e) => handle("passport", e.target.value)}
              helperText={form.passport ? (rx.passport.test(form.passport) ? " " : "Invalid Passport") : " "}
              error={!!form.passport && !rx.passport.test(form.passport)}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="E-mail (optional)"
              fullWidth
              value={form.email}
              onChange={(e) => handle("email", e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Address / Notes (optional)"
              fullWidth
              value={form.address}
              onChange={(e) => handle("address", e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Reason (optional)"
              fullWidth
              value={form.reason}
              onChange={(e) => {
                const v = e.target.value;
                if (rx.reason.test(v)) handle("reason", v);
              }}
              helperText={form.reason && !rx.reason.test(form.reason) ? "Only letters, numbers, space, comma, period." : " "}
              error={!!form.reason && !rx.reason.test(form.reason)}
            />
          </Grid>

          {status.type && (
            <Grid item xs={12}>
              <Alert severity={status.type}>{status.msg}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? "Booking…" : "Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


// src/pages/appointments/BookingDialog.jsx
import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Snackbar, Alert, Box, Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import API from "../../api";

// ---- Safe, local validators (no external rx import needed) ----
const RX = {
  personName: /^[A-Za-z\s]{2,40}$/,               // letters + spaces
  phone: /^[0-9+()\-\s]{7,20}$/,                   // simple phone
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,          // simple email
};

export default function BookingDialog({
  open,
  onClose,
  doctorId,
  doctorName,
  date,
  session, // expect { range: { start, end }, ... }
}) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}"); // { userId, role, ... }

  const [form, setForm] = useState({
    patientName: "",
    phone: "",
    email: "",
    nicOrPassport: "",
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });

  const show = (severity, message) =>
    setToast({ open: true, severity, message });

  const update = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  // Defensive: ensure we have date and a session range
  const slotStart = session?.range?.start || "";
  const slotEnd = session?.range?.end || "";

  const valid = () => {
    if (!date || !slotStart || !slotEnd) {
      show("error", "Missing date or time slot. Please pick a session again.");
      return false;
    }
    const name = (form.patientName || "").trim();
    const phone = (form.phone || "").trim();
    const email = (form.email || "").trim();
    const idNo = (form.nicOrPassport || "").trim();

    if (!name || !RX.personName.test(name)) {
      show("error", "Enter a valid patient name (letters & spaces only).");
      return false;
    }
    if (!phone || !RX.phone.test(phone)) {
      show("error", "Enter a valid phone number.");
      return false;
    }
    if (email && !RX.email.test(email)) {
      show("error", "Enter a valid email.");
      return false;
    }
    if (!idNo) {
      show("error", "NIC/Passport is required.");
      return false;
    }
    if (!user?.userId) {
      show("error", "You must be logged in as a patient to continue.");
      return false;
    }
    return true;
  };

  const makeIntent = async () => {
    if (!valid()) return;

    try {
      setBusy(true);

      // The backend must accept this payload at POST /api/appointments/intent
      const payload = {
        doctorId,
        doctorName,
        date,
        startTime: slotStart,
        patientId: user.userId,
        patientName: form.patientName.trim(),
        patientPhone: form.phone.trim(),
        patientEmail: (form.email || "").trim(),
        idNo: form.nicOrPassport.trim(),
        reason: (form.reason || "").trim(),
      };

      const { data } = await API.post("/api/appointments/intent", payload);

      // Expecting { pendingId, amount, currency }
      if (!data?.pendingId) {
        show("error", data?.message || "Could not create checkout session.");
        return;
      }

      navigate("/appointments/checkout", {
        state: {
          pendingId: data.pendingId,
          amount: data.amount ?? 0,
          currency: data.currency ?? "LKR",
          summary: {
            doctorId,
            doctorName,
            date,
            time: `${slotStart} – ${slotEnd}`,
            patientName: form.patientName,
            patientPhone: form.phone,
            patientEmail: form.email,
            idNo: form.nicOrPassport,
            reason: form.reason,
          },
        },
        replace: true,
      });

      onClose?.();
    } catch (e) {
      // No crash—just inform the user
      const msg = e?.response?.data?.message || "Validation error (400). Please check fields.";
      show("error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {doctorName || "Doctor"} • {date || "—"} • {slotStart || "??"} → {slotEnd || "??"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Complete within a few minutes. Queue number is assigned after successful payment.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="patientName"
                  label="Patient Name"
                  fullWidth
                  value={form.patientName}
                  onChange={update}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone"
                  label="Phone"
                  fullWidth
                  value={form.phone}
                  onChange={update}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="email"
                  label="Email (optional)"
                  fullWidth
                  value={form.email}
                  onChange={update}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="nicOrPassport"
                  label="NIC / Passport"
                  fullWidth
                  value={form.nicOrPassport}
                  onChange={update}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="reason"
                  label="Reason (optional)"
                  fullWidth
                  value={form.reason}
                  onChange={update}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={makeIntent} disabled={busy}>
            {busy ? "Preparing..." : "Continue to Payment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </>
  );
}

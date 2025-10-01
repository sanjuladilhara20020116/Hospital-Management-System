import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Box, Card, CardContent, TextField, Button, Typography, Snackbar, Alert } from "@mui/material";
import API from "../../api";

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const { state } = useLocation() || {};
  const pendingId = state?.pendingId;

  const [card, setCard] = useState({
    name: "",
    number: "",
    exp: "",
    cvc: "",
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });

  if (!pendingId) {
    return (
      <Box sx={{ maxWidth: 560, mx: "auto", mt: 6 }}>
        <Alert severity="error" variant="filled">Missing payment context. Please start again.</Alert>
        <Box sx={{ mt: 2 }}>
          <Button component={Link} to="/appointments" variant="contained">Back to Appointments</Button>
        </Box>
      </Box>
    );
  }

  const pay = async () => {
    if (!card.name || !card.number || !card.exp || !card.cvc) {
      setToast({ open: true, severity: "error", message: "Fill all card fields." });
      return;
    }
    try {
      setBusy(true);
      const { data } = await API.post(`/api/appointments/${encodeURIComponent(pendingId)}/pay`, {
        card, // dummy for now — backend just simulates “success”
      });

      // Expecting { appointment: { referenceNo, queueNo, ... } }
      const ref = data?.appointment?.referenceNo;
      navigate("/appointments/success", {
        state: { appointment: data?.appointment },
        replace: true,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "Payment failed. Please try again.";
      setToast({ open: true, severity: "error", message: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: 6 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Appointment Payment
          </Typography>

          {state?.summary && (
            <Box sx={{ mb: 2, color: "text.secondary" }}>
              <div><b>Doctor:</b> {state.summary.doctorName}</div>
              <div><b>Date/Time:</b> {state.summary.date} • {state.summary.time}</div>
              <div><b>Patient:</b> {state.summary.patientName}</div>
              {state.amount != null && (
                <div><b>Amount:</b> {state.currency || "LKR"} {state.amount}</div>
              )}
            </Box>
          )}

          <TextField
            label="Name on Card"
            fullWidth
            sx={{ mb: 1.5 }}
            value={card.name}
            onChange={(e) => setCard((s) => ({ ...s, name: e.target.value }))}
          />
          <TextField
            label="Card Number"
            fullWidth
            sx={{ mb: 1.5 }}
            value={card.number}
            onChange={(e) => setCard((s) => ({ ...s, number: e.target.value }))}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, mb: 2 }}>
            <TextField
              label="Expiry (MM/YY)"
              value={card.exp}
              onChange={(e) => setCard((s) => ({ ...s, exp: e.target.value }))}
            />
            <TextField
              label="CVC"
              value={card.cvc}
              onChange={(e) => setCard((s) => ({ ...s, cvc: e.target.value }))}
            />
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={pay}
            disabled={busy}
          >
            {busy ? "Processing..." : "Pay & Confirm"}
          </Button>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Button component={Link} to="/appointments" size="small">Back to Home</Button>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

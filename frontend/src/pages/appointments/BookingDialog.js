
// src/pages/appointments/BookingDialog.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  RadioGroup, FormControlLabel, Radio, MenuItem, Stack, Typography, Alert, Box, Divider, Paper, Card, InputAdornment
} from "@mui/material";
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentIcon from '@mui/icons-material/Payment';
import LockIcon from '@mui/icons-material/Lock';
import API from "../../api";
import { rx, nicOrPassportValid } from "../../utils/validators";

const TITLES = ["Mr.", "Ms.", "Mrs.", "Master", "Dr."];

export default function BookingDialog({ open, onClose, doctorId, doctorName, date, session, onBooked }) {
  const navigate = useNavigate();
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
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [gateway, setGateway] = useState({ cardNumber: "", expiry: "", cvc: "", name: "" });
  const [gatewayError, setGatewayError] = useState("");

  // Mock payment breakdown
  const doctorCharge = 2000;
  const hospitalCharge = 1000;
  const serviceFee = 250;
  const total = doctorCharge + hospitalCharge + serviceFee;

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

  // Payment gateway validation
  const gatewayValid = useMemo(() => {
    if (!gateway.cardNumber.match(/^\d{16}$/)) return false;
    if (!gateway.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)) return false;
    if (!gateway.cvc.match(/^\d{3}$/)) return false;
    if (!gateway.name.trim()) return false;
    return true;
  }, [gateway]);

  // Handles the initial continue (shows payment section)
  const handleContinue = () => {
    if (!canSubmit) {
      setStatus({ type: "error", msg: "Please fix validation errors." });
      return;
    }
    setShowPayment(true);
    setStatus({ type: "", msg: "" });
  };

  // Handles the final booking (after payment method selected)
  const handleFinalSubmit = async () => {
    if (!paymentMethod) {
      setStatus({ type: "error", msg: "Please select a payment method." });
      return;
    }
    if (paymentMethod === "online" && !gatewayValid) {
      setGatewayError("Please fill all card details correctly.");
      return;
    }
    setSubmitting(true);
    setStatus({ type: "", msg: "" });
    setGatewayError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user?.userId) throw new Error("Not logged in as Patient");
      const startTime = session?.range?.start;
      const payload = {
        patientId: user.userId,
        doctorId,
        doctorName,
        date,
        startTime,
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Online',
        priceLkr: total,
        name: form.name.trim(),
        phone: form.phone.trim(),
        nic: form.nic.trim() || null,
        passport: form.passport.trim() || null,
        email: form.email.trim() || null,
        reason: form.reason.trim(),
        payment: {
          method: paymentMethod === "cash" ? "Cash" : "Online",
          details: paymentMethod === "online" ? { ...gateway } : null,
          breakdown: {
            doctorCharge,
            hospitalCharge,
            serviceFee,
            total
          }
        }
      };
      const r = await API.post("/api/appointments", payload);
      // Send email confirmation after successful booking
      if (form.email) {
        try {
          await API.post("/api/appointments/send-confirmation-email", {
            to: form.email,
            appointment: r.data.appointment
          });
        } catch (emailErr) {
          // Optionally show a warning, but don't block booking
          setStatus({ type: "warning", msg: "Booking successful, but failed to send confirmation email." });
        }
      }
      // Navigate to AppointmentDetails page with appointment data
      navigate("/appointments/details", { state: { appointment: r.data.appointment } });
      onBooked?.(r.data.appointment);
    } catch (e) {
      const msg = e?.response?.data?.message || "Booking failed.";
      setStatus({ type: "error", msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { background: '#fff' } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 22, letterSpacing: 0.5, color: '#1976d2', pb: 1.5 }}>
        {doctorName} • {date} • {session?.range?.start} → {session?.range?.end}
      </DialogTitle>
  <DialogContent dividers sx={{ borderRadius: 3, p: { xs: 2, md: 3 }, background: '#fff' }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Complete within <b>09:17</b> (example). Queue no. will be assigned on submit.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <RadioGroup row value={form.nationality} onChange={(e) => handle("nationality", e.target.value)}>
              <FormControlLabel value="LOCAL" control={<Radio color="primary" />} label="LOCAL" />
              <FormControlLabel value="FOREIGN" control={<Radio color="primary" />} label="FOREIGN" />
            </RadioGroup>
          </Grid>

          <Grid item xs={3}>
            <TextField select label="Title" fullWidth size="small" value={form.title} onChange={(e) => handle("title", e.target.value)} sx={{ borderRadius: 2, background: '#fff' }}>
              {TITLES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={9}>
            <TextField
              label="Patient's Name"
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => {
                const v = e.target.value;
                if (rx.nameLive.test(v)) handle("name", v);
              }}
              helperText={!rx.nameSubmit.test(form.name) ? "Letters & spaces only (2–50)" : " "}
              error={form.name && !rx.nameSubmit.test(form.name)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>

          <Grid item xs={3}>
            <TextField
              select
              label="Code"
              fullWidth
              size="small"
              value={form.phoneCode}
              onChange={(e) => handle("phoneCode", e.target.value)}
              sx={{ borderRadius: 2, background: '#fff' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">📞</InputAdornment>
              }}
            >
              <MenuItem value="+94">+94</MenuItem>
              <MenuItem value="+91">+91</MenuItem>
              <MenuItem value="+1">+1</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={9}>
            <TextField
              label="Phone"
              fullWidth
              size="small"
              value={form.phone}
              onChange={(e) => {
                const v = e.target.value.replace(/\D+/g, "");
                handle("phone", v);
              }}
              helperText={!rx.phone.test(form.phone) ? "Digits only, length 9–12" : " "}
              error={form.phone && !rx.phone.test(form.phone)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="NIC (Required if no Passport)"
              fullWidth
              size="small"
              value={form.nic}
              onChange={(e) => handle("nic", e.target.value)}
              helperText={
                form.nic
                  ? (rx.sriNicNew.test(form.nic) || rx.sriNicOld.test(form.nic) ? " " : "Invalid NIC")
                  : " "
              }
              error={!!form.nic && !(rx.sriNicNew.test(form.nic) || rx.sriNicOld.test(form.nic))}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Passport (Required if no NIC)"
              fullWidth
              size="small"
              value={form.passport}
              onChange={(e) => handle("passport", e.target.value)}
              helperText={form.passport ? (rx.passport.test(form.passport) ? " " : "Invalid Passport") : " "}
              error={!!form.passport && !rx.passport.test(form.passport)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="E-mail (optional)"
              fullWidth
              size="small"
              value={form.email}
              onChange={(e) => handle("email", e.target.value)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Address / Notes (optional)"
              fullWidth
              size="small"
              value={form.address}
              onChange={(e) => handle("address", e.target.value)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Reason (optional)"
              fullWidth
              size="small"
              value={form.reason}
              onChange={(e) => {
                const v = e.target.value;
                if (rx.reason.test(v)) handle("reason", v);
              }}
              helperText={form.reason && !rx.reason.test(form.reason) ? "Only letters, numbers, space, comma, period." : " "}
              error={!!form.reason && !rx.reason.test(form.reason)}
              sx={{ borderRadius: 2, background: '#fff' }}
            />
          </Grid>

          {status.type && (
            <Grid item xs={12}>
              <Alert severity={status.type}>{status.msg}</Alert>
            </Grid>
          )}
        </Grid>

        {/* Payment Section */}
        {showPayment && (
          <Paper elevation={3} sx={{ mt: 4, p: { xs: 2, md: 3 }, borderRadius: 3, background: '#fff' }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 700, letterSpacing: 0.5 }}>Total Payment</Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <span>Doctor Charges</span>
                <b style={{ color: '#1976d2' }}>Rs. {doctorCharge.toLocaleString()}</b>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <span>Hospital Charges</span>
                <b style={{ color: '#1976d2' }}>Rs. {hospitalCharge.toLocaleString()}</b>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <span>Service Fee</span>
                <b style={{ color: '#1976d2' }}>Rs. {serviceFee.toLocaleString()}</b>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <span style={{ fontWeight: 700 }}>Total</span>
                <b style={{ color: '#388e3c', fontSize: 20 }}>Rs. {total.toLocaleString()}</b>
              </Stack>
            </Stack>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Select Payment Method</Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Paper
                elevation={paymentMethod === 'cash' ? 6 : 1}
                sx={{
                  p: 1.5,
                  px: 3,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: paymentMethod === 'cash' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  background: paymentMethod === 'cash' ? '#e3f2fd' : '#fff',
                  transition: 'all 0.2s',
                  minWidth: 160
                }}
                onClick={() => { setPaymentMethod('cash'); setGatewayError(''); }}
              >
                <AttachMoneyIcon sx={{ color: '#388e3c', mr: 1 }} />
                <Typography fontWeight={600}>Cash Payment</Typography>
              </Paper>
              <Paper
                elevation={paymentMethod === 'online' ? 6 : 1}
                sx={{
                  p: 1.5,
                  px: 3,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: paymentMethod === 'online' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  background: paymentMethod === 'online' ? '#e3f2fd' : '#fff',
                  transition: 'all 0.2s',
                  minWidth: 160
                }}
                onClick={() => { setPaymentMethod('online'); setGatewayError(''); }}
              >
                <PaymentIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography fontWeight={600}>Pay Online</Typography>
              </Paper>
            </Stack>

            {/* Mock Payment Gateway UI */}
            {paymentMethod === "online" && (
              <Card elevation={0} sx={{ mt: 2, p: { xs: 2, md: 3 }, border: '1px solid #e3e3e3', borderRadius: 3, background: '#fff', boxShadow: '0 2px 16px 0 rgba(60,60,100,0.06)' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
                  {/* Card Preview */}
                  <Box sx={{ minWidth: 320, maxWidth: 370, mb: { xs: 2, md: 0 } }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, #1976d2 60%, #42a5f5 100%)',
                      borderRadius: 3,
                      color: '#fff',
                      p: 3,
                      minHeight: 140,
                      minWidth: 200,
                      maxWidth: 230,
                      boxShadow: 3,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <Box sx={{ position: 'absolute', top: 18, right: 18 }}>
                        {/* Card network logo (static Visa) */}
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" style={{ height: 25, width: 40, opacity: 0.9 }} />
                      </Box>
                      <Typography sx={{ fontSize: 15, letterSpacing: 1.5, mb: 1.5, fontFamily: 'monospace', userSelect: 'none', marginTop: 2 }}>
                        {gateway.cardNumber ? gateway.cardNumber.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                      </Typography>
                      {/* Card details layout: Card Holder on one line, Expiry and CVC below */}
                      <Box sx={{ mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 12, opacity: 0.7 }}>CARD HOLDER</Typography>
                          <Typography sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>
                            {gateway.name || 'FULL NAME'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                          <Box>
                            <Typography sx={{ fontSize: 12, opacity: 0.7 }}>EXPIRES</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>
                              {gateway.expiry || 'MM/YY'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontSize: 12, opacity: 0.7, marginLeft: 11 }}>CVC</Typography>
                            <Typography sx={{ fontWeight: 600, fontSize: 12, letterSpacing: 1, marginLeft: 11 }}>
                              {gateway.cvc || '•••'}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Box sx={{ position: 'absolute', bottom: 12, right: 18, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LockIcon sx={{ fontSize: 14, opacity: 0.8 }} />
                        <Typography sx={{ fontSize: 10, opacity: 0.8 }}>Secure Payment</Typography>
                      </Box>
                    </Box>
                  </Box>
                  {/* Card Form */}
                  <Box sx={{ flex: 1, width: '100%' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sx={{ width: '365px', marginLeft: 4 }}>
                        <TextField
                          label="Card Number"
                          fullWidth
                          size="medium"
                          value={gateway.cardNumber}
                          onChange={e => setGateway(g => ({ ...g, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                          placeholder="1234 5678 9012 3456"
                          error={!!gateway.cardNumber && !/^\d{16}$/.test(gateway.cardNumber)}
                          helperText={gateway.cardNumber && !/^\d{16}$/.test(gateway.cardNumber) ? "16 digits required" : " "}
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><CreditCardIcon sx={{ color: '#1976d2' }} /></InputAdornment>
                          }}
                          sx={{ borderRadius: 2, background: '#fff' }}
                        />
                      </Grid>
                      <Grid item xs={6} md={4} sx={{ width: '167px', marginLeft: 4 }}>
                        <TextField
                          label="Expiry (MM/YY)"
                          fullWidth
                          size="medium"
                          value={gateway.expiry}
                          onChange={e => setGateway(g => ({ ...g, expiry: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) }))}
                          placeholder="MM/YY"
                          error={!!gateway.expiry && !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(gateway.expiry)}
                          helperText={gateway.expiry && !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(gateway.expiry) ? "MM/YY" : " "}
                          sx={{ borderRadius: 2, background: '#fff' }}
                        />
                      </Grid>
                      <Grid item xs={6} md={4} sx={{ width: '167px', marginLeft: 1.7 }}>
                        <TextField
                          label="CVC"
                          fullWidth
                          size="medium"
                          value={gateway.cvc}
                          onChange={e => setGateway(g => ({ ...g, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                          placeholder="123"
                          error={!!gateway.cvc && !/^\d{3}$/.test(gateway.cvc)}
                          helperText={gateway.cvc && !/^\d{3}$/.test(gateway.cvc) ? "3 digits" : " "}
                          sx={{ borderRadius: 2, background: '#fff' }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4} sx={{ width: '365px', marginLeft: 4 }}>
                        <TextField
                          label="Name on Card"
                          fullWidth
                          size="medium"
                          value={gateway.name}
                          onChange={e => setGateway(g => ({ ...g, name: e.target.value }))}
                          error={!!gateway.name && !gateway.name.trim()}
                          helperText={gateway.name && !gateway.name.trim() ? "Required" : " "}
                          sx={{ borderRadius: 2, background: '#fff' }}
                        />
                      </Grid>
                    </Grid>
                    {gatewayError && <Alert severity="error" sx={{ mt: 2 }}>{gatewayError}</Alert>}
                  </Box>
                </Stack>
              </Card>
            )}
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2, fontWeight: 600 }}>Cancel</Button>
        {!showPayment ? (
          <Button variant="contained" onClick={handleContinue} disabled={!canSubmit || submitting} sx={{ borderRadius: 2, fontWeight: 700, boxShadow: 2 }}>
            {submitting ? "Booking…" : "Continue"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleFinalSubmit}
            disabled={submitting || (paymentMethod === "online" && !gatewayValid)}
            sx={{ borderRadius: 2, fontWeight: 700, boxShadow: 2 }}
          >
            {submitting ? "Booking…" : paymentMethod === "online" ? "Pay & Book" : "Book Appointment"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}


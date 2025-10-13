// src/pages/Cart.js
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// MUI
import {
  Box, Container, Grid, Paper, Typography, Button, Divider, Chip, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, TextField, IconButton,
  Select, MenuItem, InputLabel, FormControl,
  Snackbar, Alert, Tooltip, Card, CardContent, Skeleton, InputAdornment, useMediaQuery,
  useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import EventIcon from '@mui/icons-material/Event';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // keep consistent with other pages

export default function Cart() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('md'));
  const hdrs = { 'Content-Type': 'application/json', 'x-user-id': USER_ID };

  const [cart, setCart] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState('Loading cart…');
  const [loading, setLoading] = useState(true);

  // Booking form
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); // fixed to ONLINE

  // Card fields — SAFE MODE (no cardholder name captured/sent)
  const [cardBrand, setCardBrand] = useState('VISA'); // VISA, MASTERCARD, AMEX
  const [cardNumber, setCardNumber] = useState(''); // raw digits only (max 16)
  const [cardExp, setCardExp] = useState(''); // MM/YY
  const [cardCvv, setCardCvv] = useState('');

  // Inline errors
  const [errors, setErrors] = useState({});

  // UI
  const [toast, setToast] = useState({ open: false, severity: 'info', message: '' });
  const bookingInProgress = status === 'Booking...';

  const showToast = (severity, message) => setToast({ open: true, severity, message });

  const load = async () => {
    try {
      setLoading(true);
      setStatus('Loading cart…');
      const res = await fetch(`${API_BASE}/api/cart`, { headers: hdrs });
      let data;
      try { data = await res.json(); } catch { data = { items: [], total: 0 }; }
      setCart(data || { items: [], total: 0 });
      setStatus('');
    } catch {
      setStatus('Failed to load cart');
      showToast('error', 'Network error while loading cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const qty = async (itemId, q) => {
    const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
      method: 'PUT',
      headers: hdrs,
      body: JSON.stringify({ quantity: q })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCart(data.cart);
      window.dispatchEvent(new Event('cart:updated'));
      showToast('success', 'Quantity updated');
    } else {
      showToast('error', data.message || 'Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    const res = await fetch(`${API_BASE}/api/cart/item/${itemId}`, {
      method: 'DELETE',
      headers: hdrs
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCart(data.cart);
      window.dispatchEvent(new Event('cart:updated'));
      showToast('success', 'Item removed');
    } else {
      showToast('error', data.message || 'Failed to remove item');
    }
  };

  // --- Helpers & validators ---
  const onlyDigits = (s) => (s || '').replace(/\D/g, '');
  // letters and spaces only (at least one letter if provided)
  const isLettersAndSpaces = (s) => /^[A-Za-z ]+$/.test((s || '').trim());
  const luhn = (num) => {
    const s = onlyDigits(num);
    let sum = 0, alt = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let n = parseInt(s[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return s.length >= 12 && (sum % 10 === 0);
  };
  const parseExp = (mmYY) => {
    const m = (mmYY || '').trim();
    const m2 = m.includes('/') ? m : (m.length === 4 ? `${m.slice(0,2)}/${m.slice(2)}` : m);
    const match = /^(\d{2})\/(\d{2})$/.test(m2) ? m2.match(/^(\d{2})\/(\d{2})$/) : null;
    if (!match) return null;
    const mm = parseInt(match[1], 10), yy = parseInt(`20${match[2]}`, 10);
    if (mm < 1 || mm > 12) return null;
    const expDate = new Date(yy, mm, 0, 23, 59, 59);
    const now = new Date();
    if (expDate < now) return null;
    return { expMonth: mm, expYear: yy };
  };
  const cvvLenByBrand = (brand) => (brand === 'AMEX' ? 4 : 3);

  // Brand hint based on number prefix
  const detectedBrand = useMemo(() => {
    const d = onlyDigits(cardNumber);
    if (/^3[47]/.test(d)) return 'AMEX';
    if (/^5[1-5]/.test(d)) return 'MASTERCARD';
    if (/^4/.test(d)) return 'VISA';
    return cardBrand;
  }, [cardNumber, cardBrand]);

  // --- NEW: Prevent past-date selection (both UI min + validation) ---
  const pad2 = (n) => String(n).padStart(2, '0');
  const minDateTime = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }, []);

  // Inline field validation
  const validateFields = () => {
    const e = {};
    if (!patientEmail) e.patientEmail = 'Email is required';
    if (!appointmentDate) e.appointmentDate = 'Choose date & time';

    // Past-date hard block
    if (appointmentDate) {
      const selected = new Date(appointmentDate);
      const now = new Date();
      if (selected.getTime() < now.getTime()) {
        e.appointmentDate = 'Date/time cannot be in the past';
      }
    }

    // Patient name: optional, but if provided must be letters and spaces ONLY
    if (patientName && !isLettersAndSpaces(patientName)) {
      e.patientName = 'Letters and spaces only';
    }

    // Card validations (ONLINE enforced)
    const digits = onlyDigits(cardNumber);
    if (digits.length !== 16) {
      e.cardNumber = 'Card number must be exactly 16 digits';
    } else if (!luhn(digits)) {
      e.cardNumber = 'Invalid card number';
    }

    const exp = parseExp(cardExp);
    if (!exp) e.cardExp = 'Invalid expiry (use MM/YY)';

    if (!/^\d+$/.test(cardCvv) || cardCvv.length !== cvvLenByBrand(detectedBrand)) {
      e.cardCvv = `CVV must be ${cvvLenByBrand(detectedBrand)} digits`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkout = async () => {
    if (!validateFields()) return;

    // SAFE MODE payload: brand + last4 + expiry only
    const exp = parseExp(cardExp);
    const cardPayload = {
      brand: detectedBrand,
      last4: onlyDigits(cardNumber).slice(-4),
      expMonth: exp.expMonth,
      expYear: exp.expYear
    };

    setStatus('Booking...');
    const res = await fetch(`${API_BASE}/api/bookings/checkout`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        patientEmail,
        patientName,
        appointmentDate,
        paymentMethod: 'ONLINE',
        card: cardPayload
      })
    });
    let data;
    try { data = await res.json(); } catch { data = { message: await res.text() }; }

    if (res.ok) {
      setStatus(data.message || 'Booked!');
      setCart({ items: [], total: 0 });
      window.dispatchEvent(new Event('cart:updated'));
      // reset form
      setPatientEmail(''); setPatientName(''); setAppointmentDate('');
      setPaymentMethod('ONLINE');
      setCardBrand('VISA'); setCardNumber(''); setCardExp(''); setCardCvv('');
      setErrors({});
      showToast('success', data.message || 'Booked!');
    } else {
      setStatus('');
      showToast('error', data.message || 'Booking failed');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* style tweaks just for this page */}
      <Box component="style">{`
        .soft-gradient{
          background:
            radial-gradient(800px 400px at 100% 0%, rgba(99,102,241,0.09), transparent 60%),
            radial-gradient(600px 360px at 0% 20%, rgba(16,185,129,0.08), transparent 55%);
        }
        .ring-focus:focus-within{
          box-shadow: 0 0 0 4px ${theme.palette.primary.main}22;
          border-color: ${theme.palette.primary.main};
        }
        .striped tbody tr:nth-of-type(odd){ background: ${theme.palette.action.hover}; }
      `}</Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 4, gap: 2 }}
      >
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.success.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            letterSpacing: '.3px'
          }}
        >
          <ShoppingCartCheckoutIcon fontSize="large" />
          Your Health Package Cart
        </Typography>

        <Button
          variant="outlined"
          color="secondary"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/my-bookings')}
          sx={{
            px: 3, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700,
            borderWidth: 2
          }}
        >
          View My Bookings
        </Button>
      </Stack>

      {!!status && status !== 'Loading cart…' && (
        <Box sx={{ mb: 3 }}>
          <Alert
            severity={status.startsWith('Booked') ? 'success' : 'info'}
            sx={{
              borderRadius: 2,
              boxShadow: theme.shadows[2],
              '& .MuiAlert-icon': { alignItems: 'center' }
            }}
          >
            {status}
          </Alert>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Left: Cart items */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            className="soft-gradient"
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 8px 30px rgba(2,6,23,.06)'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <ReceiptIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Selected Packages</Typography>
              <Chip
                label={`${cart.items?.length || 0} item${cart.items?.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  ml: 'auto',
                  fontWeight: 700,
                  bgcolor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText
                }}
              />
            </Stack>
            <Divider sx={{ mb: 3, borderColor: theme.palette.divider }} />

            {loading ? (
              <Stack spacing={2}>
                {[1, 2, 3].map((i) => (
                  <Paper key={i} elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Skeleton variant="rectangular" width={60} height={60} sx={{ borderRadius: 1 }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="60%" height={24} />
                        <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
                      </Box>
                      <Skeleton width={80} height={40} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader className="striped"
                  sx={{
                    '& thead th': {
                      backgroundColor: theme.palette.grey[50],
                      fontWeight: 700,
                      color: theme.palette.text.secondary,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    },
                    '& tbody td': { borderBottom: `1px solid ${theme.palette.divider}` }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Package</TableCell>
                      <TableCell align="right">Price (Rs.)</TableCell>
                      <TableCell align="center" width={120}>Quantity</TableCell>
                      <TableCell align="right">Subtotal (Rs.)</TableCell>
                      <TableCell align="center" width={80}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(cart.items || []).map(it => (
                      <TableRow
                        key={it._id}
                        hover
                        sx={{
                          '&:hover': { backgroundColor: theme.palette.action.hover }
                        }}
                      >
                        <TableCell>
                          <Typography fontWeight={700}>{it.packageName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Includes {it.testsCount || 0} tests
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {Number(it.unitPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{
                              min: 1,
                              style: { textAlign: 'center', padding: '8.5px 8px' }
                            }}
                            value={it.quantity}
                            onChange={e => qty(it._id, Math.max(1, Number(e.target.value || 1)))}
                            className="ring-focus"
                            sx={{
                              width: 96,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'background.paper'
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={800} color="primary">
                            {Number(it.unitPrice * it.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remove item">
                            <IconButton
                              color="error"
                              onClick={() => removeItem(it._id)}
                              sx={{
                                borderRadius: 2,
                                '&:hover': { backgroundColor: theme.palette.error.light }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!cart.items || !cart.items.length) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Stack
                            alignItems="center"
                            spacing={1}
                            sx={{
                              py: 6,
                              color: 'text.secondary',
                              textAlign: 'center'
                            }}
                          >
                            <ShoppingCartCheckoutIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                            <Typography variant="h6" fontWeight={800}>
                              Your cart is empty
                            </Typography>
                            <Typography variant="body2">
                              Browse our healthcare packages and add items to continue.
                            </Typography>
                            <Button
                              sx={{
                                mt: 2, px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 700
                              }}
                              variant="contained"
                              onClick={() => navigate('/healthcare-packages')}
                            >
                              Browse Packages
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right: Summary + Schedule & Payment */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3} position="sticky" top={isSm ? 0 : 24}>
            <Card
              elevation={0}
              className="soft-gradient"
              sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 8px 30px rgba(2,6,23,.06)'
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                  Order Summary
                </Typography>
                <Divider sx={{ my: 2, borderColor: theme.palette.divider }} />
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Subtotal</Typography>
                    <Typography fontWeight={700}>
                      Rs. {Number(cart.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Taxes & Fees</Typography>
                    <Typography fontWeight={700}>—</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography color="text.secondary">Discount</Typography>
                    <Typography fontWeight={700} color="error.main">
                      — No discount applied
                    </Typography>
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2, borderColor: theme.palette.divider }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={900}>Total Amount</Typography>
                  <Chip
                    color="primary"
                    variant="outlined"
                    label={`Rs. ${Number(cart.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                    sx={{ fontWeight: 800, px: 0.5 }}
                  />
                </Stack>
              </CardContent>
            </Card>

            <Paper
              elevation={0}
              className="soft-gradient"
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 8px 30px rgba(2,6,23,.06)'
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <EventIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>Appointment Details</Typography>
              </Stack>
              <Divider sx={{ mb: 3, borderColor: theme.palette.divider }} />

              <Stack spacing={2.5}>
                <TextField
                  label="Patient name (optional)"
                  value={patientName}
                  onChange={e => {
                    // Allow letters and spaces only; strip any other characters
                    const cleaned = e.target.value.replace(/[^A-Za-z ]/g, '');
                    setPatientName(cleaned);
                  }}
                  fullWidth
                  error={!!errors.patientName}
                  helperText={errors.patientName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                  className="ring-focus"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Patient email"
                  type="email"
                  value={patientEmail}
                  onChange={e => setPatientEmail(e.target.value)}
                  fullWidth
                  required
                  error={!!errors.patientEmail}
                  helperText={errors.patientEmail}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                  className="ring-focus"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  label="Appointment Date & Time"
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={e => {
                    const val = e.target.value;
                    setAppointmentDate(val);
                    // live guard: mark error if user types a past date/time
                    setErrors(prev => {
                      const next = { ...prev };
                      if (!val) {
                        next.appointmentDate = 'Choose date & time';
                      } else {
                        const selected = new Date(val);
                        const now = new Date();
                        if (selected.getTime() < now.getTime()) {
                          next.appointmentDate = 'Date/time cannot be in the past';
                        } else {
                          delete next.appointmentDate;
                        }
                      }
                      return next;
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  error={!!errors.appointmentDate}
                  helperText={errors.appointmentDate || 'Select a convenient time for your visit'}
                  inputProps={{ min: minDateTime }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                  className="ring-focus"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                {/* Payment method banner (ONLINE only) */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `2px solid ${theme.palette.primary.main}55`,
                    bgcolor: theme.palette.primary.light + '22',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: theme.palette.primary.light,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CreditCardIcon color="primary" />
                  </Box>
                  <Box>
                    <Typography fontWeight={700}>Online Payment</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Secure card payment is required to confirm your booking.
                    </Typography>
                  </Box>
                </Paper>

                {/* Card fields (always visible, since ONLINE is enforced) */}
                <Box sx={{
                  border: '1px solid', borderColor: theme.palette.divider, borderRadius: 2, p: 3,
                  bgcolor: theme.palette.grey[50]
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <PaymentIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800}>Card Details</Typography>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel id="card-type-label">Card type</InputLabel>
                        <Select
                          labelId="card-type-label"
                          label="Card type"
                          value={detectedBrand}
                          onChange={e => setCardBrand(e.target.value)}
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="VISA">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <img src="images\\download.png" alt="Visa" width={24} />
                              <span>Visa</span>
                            </Stack>
                          </MenuItem>
                          <MenuItem value="MASTERCARD">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <img src="images\\master.png" alt="Mastercard" width={24} />
                              <span>Mastercard</span>
                            </Stack>
                          </MenuItem>
                          <MenuItem value="AMEX">
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <img src="images\\amex.png" alt="American Express" width={24} />
                              <span>Amex</span>
                            </Stack>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* SAFE MODE: no "Name on card" field */}

                    <Grid item xs={12}>
                      <TextField
                        label="Card number (16 digits)"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setCardNumber(digits);
                        }}
                        fullWidth
                        placeholder="Enter 16 digits"
                        error={!!errors.cardNumber}
                        helperText={errors.cardNumber || 'Safe mode: we never send or store the full number.'}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {errors.cardNumber ? (
                                <WarningAmberRoundedIcon color="error" />
                              ) : (
                                <CheckCircleRoundedIcon
                                  color={cardNumber.length === 16 ? 'success' : 'action'}
                                />
                              )}
                            </InputAdornment>
                          ),
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Expiry (MM/YY)"
                        value={cardExp}
                        onChange={e => setCardExp(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))}
                        placeholder="MM/YY"
                        fullWidth
                        required
                        error={!!errors.cardExp}
                        helperText={errors.cardExp}
                        className="ring-focus"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label={detectedBrand === 'AMEX' ? 'CVV (4 digits)' : 'CVV (3 digits)'}
                        inputMode="numeric"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, (detectedBrand === 'AMEX' ? 4 : 3)))}
                        fullWidth
                        required
                        error={!!errors.cardCvv}
                        helperText={errors.cardCvv || 'Not stored.'}
                        className="ring-focus"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Button
                  size="large"
                  variant="contained"
                  onClick={checkout}
                  startIcon={<ShoppingCartCheckoutIcon />}
                  disabled={!cart.items?.length || bookingInProgress}
                  sx={{
                    mt: 1,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 800,
                    textTransform: 'none',
                    boxShadow: 'none',
                    backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      boxShadow: 'none',
                      backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                    }
                  }}
                  fullWidth
                >
                  {bookingInProgress ? 'Processing Booking…' : 'Confirm & Book Appointment'}
                </Button>

                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                  By proceeding, you agree to our Terms of Service and Privacy Policy
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          variant="filled"
          severity={toast.severity}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: theme.shadows[4],
            alignItems: 'center'
          }}
          iconMapping={{
            success: <CheckCircleRoundedIcon fontSize="inherit" />,
            error: <WarningAmberRoundedIcon fontSize="inherit" />,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

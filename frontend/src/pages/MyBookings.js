// src/pages/MyBookings.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Container, Typography, Button, Card, CardContent, Chip, Divider,
  Grid, Stack, List, ListItem, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, useTheme,
  Alert, TextField, InputAdornment
} from '@mui/material';
import {
  Event as EventIcon,
  LocalHospital as HospitalIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1';

// Put your logo in /public/logo.png (or .jpg/.webp). Update path if needed.
const LOGO_URL = '/Blue and White Simple Medical Health Logo.png';

export default function MyBookings() {
  const theme = useTheme();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // ----- filters (non-destructive) -----
  const [qBookingId, setQBookingId] = useState('');
  const [fromDate, setFromDate] = useState('');

  const filteredList = useMemo(() => {
    const idQ = qBookingId.trim().toLowerCase();
    const fromTS = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;

    return (list || []).filter(b => {
      const id = (b?._id || '').toLowerCase();
      const idTail = id.slice(-8);
      const idOk = !idQ || id.includes(idQ) || idTail.includes(idQ);

      const when = new Date(b.appointmentDate).getTime();
      const dateOk = !fromTS || when >= fromTS;

      return idOk && dateOk;
    });
  }, [list, qBookingId, fromDate]);

  const load = async () => {
    try {
      setLoading(true);
      setStatus('Loading your bookings…');
      const res = await fetch(`${API_BASE}/api/bookings/mine`, {
        headers: { 'x-user-id': USER_ID }
      });

      let data;
      try { data = await res.json(); } catch { data = []; }

      if (!res.ok) {
        setStatus(data?.message || `Failed to load (HTTP ${res.status})`);
        return;
      }

      setList(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (e) {
      console.error('my-bookings load error:', e);
      setStatus('Network error loading bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  // ---------- shared helpers ----------
  const toRGB = (hex) => {
    const s = (hex || '').replace('#', '');
    const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    const n = parseInt(v || '000000', 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const currency = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });

  const imageToPngDataURL = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png')); // force PNG
        } catch (err) { reject(err); }
      };
      img.onerror = reject;
      img.src = src;
    });

  /**
   * Load a logo from URL and return { dataURL, format } for jsPDF.addImage.
   * Falls back to rasterizing vector/unknown formats to PNG.
   */
  const loadLogo = async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Logo fetch failed: HTTP ${res.status}`);
      const blob = await res.blob();

      const mime = (blob.type || '').toLowerCase();

      // Unsupported/unknown types: rasterize to PNG
      if (!mime || /(svg|ico)/.test(mime)) {
        const objectUrl = URL.createObjectURL(blob);
        try {
          const pngDataUrl = await imageToPngDataURL(objectUrl);
          URL.revokeObjectURL(objectUrl);
          return { dataURL: pngDataUrl, format: 'PNG' };
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          console.warn('Failed to rasterize logo; continuing without logo.', err);
          return null;
        }
      }

      // Supported: PNG/JPEG/WEBP
      const dataURL = await blobToDataURL(blob);
      if (mime.includes('png')) return { dataURL, format: 'PNG' };
      if (mime.includes('jpeg') || mime.includes('jpg')) return { dataURL, format: 'JPEG' };
      if (mime.includes('webp')) return { dataURL, format: 'WEBP' };

      // Fallback try rasterize
      const objectUrl = URL.createObjectURL(blob);
      try {
        const pngDataUrl = await imageToPngDataURL(objectUrl);
        URL.revokeObjectURL(objectUrl);
        return { dataURL: pngDataUrl, format: 'PNG' };
      } catch {
        URL.revokeObjectURL(objectUrl);
        return null;
      }
    } catch (err) {
      console.warn('Logo load failed; continuing without logo.', err);
      return null;
    }
  };

  // ---------- data enrichment helpers ----------
  const fetchPackagesMap = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/packages`, { cache: 'no-store' });
      const arr = await res.json().catch(() => []);
      if (!res.ok || !Array.isArray(arr)) return new Map();
      return new Map(arr.map(p => [p.name, p]));
    } catch {
      return new Map();
    }
  };

  const safeImageDataURL = async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const mime = (blob.type || '').toLowerCase();
      if (mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg') || mime.includes('webp')) {
        return await blobToDataURL(blob);
      }
      const objectUrl = URL.createObjectURL(blob);
      try {
        const png = await imageToPngDataURL(objectUrl);
        return png;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      return null;
    }
  };

  // ---------- drawing helpers ----------
  const drawDivider = (doc, x1, y, x2, hex = '#E5E7EB') => {
    const { r, g, b } = toRGB(hex);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1);
    doc.line(x1, y, x2, y);
  };

  const drawPill = (doc, { x, y, h = 26, text = '', padX = 12, fill = '#0ea5e9', color = '#fff', radius = 12, size = 12, weight = 'bold' }) => {
    const w = doc.getTextWidth(text) + padX * 2;
    const { r, g, b } = toRGB(fill);
    doc.setFillColor(r, g, b);
    doc.roundedRect(x, y, w, h, radius, radius, 'F');
    doc.setTextColor(color);
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.text(String(text), x + w / 2, y + h / 2 + 3.5, { align: 'center' });
    return w;
  };

  // ---------- PDF generation ----------
  const downloadPDF = async () => {
    if (!selected) return;

    const primaryHex = theme.palette.primary.main;
    const primaryDark = theme.palette.primary.dark || theme.palette.primary.main; // single declaration
    const borderHex = '#E5E7EB';
    const textHex = '#111827';
    const mutedHex = '#6B7280';

    const pkgsByName = await fetchPackagesMap();
    const enrichedItems = (selected.items || []).map(it => {
      const pkg = pkgsByName.get(it.packageName) || {};
      return {
        ...it,
        tests: Array.isArray(pkg.tests) ? pkg.tests : [],
        photoUrl: pkg.photo ? `${API_BASE}${pkg.photo}` : null
      };
    });

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setProperties({
      title: `Booking ${selected._id}`,
      subject: 'Healthcare Package Booking',
      author: 'LifeNext',
      creator: 'LifeNext Web App',
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 40;
    const right = pageW - 40;

    // Header band
    const prim = toRGB(primaryHex);
    doc.setFillColor(prim.r, prim.g, prim.b);
    doc.rect(0, 0, pageW, 96, 'F');

    // ---- Circular logo badge (like the sample image) ----
    try {
      const logo = await loadLogo(LOGO_URL);
      if (logo?.dataURL && logo?.format) {
        // Badge center and radii
        const cx = left + 70;          // horizontal position of the badge center
        const cy = 48;                 // vertical position of the badge center (within 96px header)
        const R  = 44;                 // outer radius of white disc
        const innerRing = R - 6;       // inner ring radius
        const logoSize  = 64;          // logo square size

        // Outer white disc
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, R, 'F');

        // Outer bright ring
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(3);
        doc.circle(cx, cy, R, 'S');

        // Soft secondary ring (very light gray/blue)
        doc.setDrawColor(235, 240, 248); // subtle ring color
        doc.setLineWidth(1);
        doc.circle(cx, cy, innerRing, 'S');

        // Place the logo centered inside the disc
        doc.addImage(
          logo.dataURL,
          logo.format,
          cx - logoSize / 2,
          cy - logoSize / 2,
          logoSize,
          logoSize
        );
      }
    } catch {
      // no-op: missing/failed logo should not break export
    }

    // Title + ID
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Booking', right, 40, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`ID: ${selected._id}`, right, 60, { align: 'right' });

    // Summary box
    let y = 120;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(left, y - 10, pageW - 80, 150, 8, 8, 'F');
    drawDivider(doc, left, y + 58, right, '#E5E7EB');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(textHex);
    doc.text('Summary', left + 12, y + 6);

    const payCard = selected.payment?.card || selected.card || {};
    const brand = payCard.brand ? String(payCard.brand).toUpperCase() : null;
    const last4 = payCard.last4 ? String(payCard.last4) : null;
    const exp = (payCard.expMonth && payCard.expYear)
      ? `${String(payCard.expMonth).padStart(2, '0')}/${String(payCard.expYear).slice(-2)}`
      : null;
    const maskedCard = (brand && last4) ? `${brand} •••• ${last4}${exp ? `  (exp ${exp})` : ''}` : '—';

    const colA = left + 12;
    const colB = left + Math.floor((pageW - 80) / 2) + 12;
    const lineGap = 18;
    let rowA = y + 28, rowB = y + 28;

    const printKV = (k, v, x, yy) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(mutedHex);
      doc.setFontSize(10); doc.text(k, x, yy);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(textHex);
      doc.setFontSize(11); doc.text(String(v), x + 130, yy);
    };

    const dateStr = new Date(selected.appointmentDate).toLocaleDateString();
    const timeStr = new Date(selected.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const method = selected.payment?.method === 'ONLINE' ? 'Online Payment' : 'Pay at Center';
    const statusUpper = (selected.status || 'Pending').toUpperCase();

    [
      ['Status:', statusUpper],
      ['Appointment:', `${dateStr} ${timeStr}`],
      ['Payment Method:', method],
      ['Payment (masked):', maskedCard],
      ['Patient Name:', selected.patientName || '—'],
      ['Patient Email:', selected.patientEmail || '—'],
    ].forEach((pair, i) => {
      const [k, v] = pair;
      if (i < 3) { printKV(k, v, colA, rowA); rowA += lineGap; }
      else { printKV(k, v, colB, rowB); rowB += lineGap; }
    });

    // Items table (green header)
    const tableStartY = y + 160;
    const HEADER_GREEN = [22, 163, 74];  // #16A34A
    const BORDER_GRAY  = [229, 231, 235];

    autoTable(doc, {
      startY: tableStartY,
      margin: { left, right: 40 },
      head: [['Package', 'Tests', 'Qty', 'Unit (Rs.)', 'Subtotal (Rs.)']],
      body: enrichedItems.map(it => ([
        it.packageName,
        String(it.tests?.length || it.testsCount || 0),
        String(it.quantity),
        Number(it.unitPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
        Number(it.unitPrice * it.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })
      ])),
      styles: {
        font: 'helvetica',
        fontSize: 11,
        cellPadding: 8,
        lineColor: BORDER_GRAY,
        lineWidth: 0.6,
        textColor: '#111827'
      },
      headStyles: {
        fillColor: HEADER_GREEN,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'left',
        valign: 'middle',
        lineColor: [255, 255, 255],
        lineWidth: 1
      },
      alternateRowStyles: { fillColor: '#F9FAFB' },
      columnStyles: {
        1: { halign: 'center', cellWidth: 80 },
        2: { halign: 'center', cellWidth: 60 },
        3: { halign: 'right',  cellWidth: 110 },
        4: { halign: 'right',  cellWidth: 130 }
      },
      tableLineColor: BORDER_GRAY,
      tableLineWidth: 0.6
    });

    // Total box
    const totalsY = doc.lastAutoTable.finalY + 18;
    const totalsH = 70;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageW - 260, totalsY, 220, totalsH, 10, 10, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor('#6B7280');
    doc.text('Total Amount', pageW - 245, totalsY + 24);
    drawPill(doc, {
      x: pageW - 245, y: totalsY + 34,
      text: currency(selected.totalAmount || 0),
      fill: primaryDark,
      color: '#fff'
    });

    // Package details after total
    let detailsY = totalsY + totalsH + 30;
    const bottomPad = 60;
    if (detailsY > pageH - bottomPad) {
      doc.addPage();
      detailsY = 50;
    }

    doc.setFont('helvetica', 'bold'); doc.setTextColor(textHex); doc.setFontSize(14);
    doc.text('Package Details', 40, detailsY);
    detailsY += 10;
    drawDivider(doc, 40, detailsY + 8, pageW - 40, borderHex);
    detailsY += 20;

    for (const it of enrichedItems) {
      const testsCount = (it.tests?.length || 0);
      const estimated = Math.max(96, testsCount * 12 + 46);
      if (detailsY + estimated > pageH - bottomPad) { doc.addPage(); detailsY = 50; }

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(40, detailsY, pageW - 80, estimated, 10, 10, 'F');

      doc.setFont('helvetica', 'bold'); doc.setTextColor(textHex); doc.setFontSize(12);
      doc.text(it.packageName, 54, detailsY + 24);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(mutedHex); doc.setFontSize(10);
      doc.text(`Qty: ${it.quantity}`, 54, detailsY + 42);
      doc.text(`Unit: ${currency(it.unitPrice)}    •    Subtotal: ${currency(it.unitPrice * it.quantity)}`, 130, detailsY + 42);

      const thumbW = 120, thumbH = 78;
      const thumbX = pageW - 40 - thumbW - 12, thumbY = detailsY + 14;
      if (it.photoUrl) {
        try {
          const dataUrl = await safeImageDataURL(it.photoUrl);
          if (dataUrl) {
            doc.setDrawColor(230, 230, 230);
            doc.roundedRect(thumbX - 6, thumbY - 6, thumbW + 12, thumbH + 12, 8, 8);
            doc.addImage(dataUrl, 'PNG', thumbX, thumbY, thumbW, thumbH);
          }
        } catch {}
      }

      let ty = detailsY + 64;
      doc.setFont('helvetica', 'bold'); doc.setTextColor(textHex); doc.setFontSize(11);
      doc.text('Tests included:', 54, ty); ty += 14;

      doc.setFont('helvetica', 'normal'); doc.setTextColor('#374151'); doc.setFontSize(10);
      if (testsCount) {
        for (const t of it.tests) {
          const wrapped = doc.splitTextToSize(`• ${t}`, pageW - 40 - 200);
          if (ty + wrapped.length * 12 > pageH - bottomPad) {
            doc.addPage();
            ty = 50;
          }
          doc.text(wrapped, 60, ty);
          ty += wrapped.length * 12;
        }
      } else {
        const fallback = `• Includes ${String(it.testsCount || 0)} tests (detailed list not captured at booking time)`;
        doc.text(fallback, 60, ty);
        ty += 12;
      }

      detailsY = Math.max(ty + 14, detailsY + estimated + 14);
    }

    // Footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pW = doc.internal.pageSize.getWidth();
      const l = 40, r = pW - 40;
      const footerY = doc.internal.pageSize.getHeight() - 28;
      drawDivider(doc, l, footerY - 10, r);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor('#6B7280');
      doc.text(`Page ${i} of ${pageCount}`, l, footerY);
      doc.text('My Health Packages', r, footerY, { align: 'right' });
    }

    doc.save(`booking_${selected._id}.pdf`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HospitalIcon fontSize="large" color="primary" />
          My Health Packages
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          onClick={load}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ px: 3, py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>

      {/* Filters */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Search by Booking ID"
                value={qBookingId}
                onChange={(e) => setQBookingId(e.target.value)}
                fullWidth
                placeholder="Type full ID or last 8 characters"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="From Date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${filteredList.length} result${filteredList.length === 1 ? '' : 's'}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Button
                  onClick={() => { setQBookingId(''); setFromDate(''); }}
                  variant="text"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Clear filters
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {status && (
        <Box sx={{ mb: 3 }}>
          <Alert severity={status.includes('error') ? 'error' : 'info'} sx={{ borderRadius: 2 }}>
            {status}
          </Alert>
        </Box>
      )}

      {!list.length && !loading && !status && (
        <Card elevation={0} sx={{
          p: 6,
          textAlign: 'center',
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: 3,
          backgroundColor: theme.palette.background.paper
        }}>
          <InfoIcon color="action" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No bookings found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't booked any health packages yet.
          </Typography>
          <Button
            variant="contained"
            href="/healthcare-packages"
            sx={{ px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Browse Health Packages
          </Button>
        </Card>
      )}

      <Grid container spacing={3}>
        {filteredList.map(b => (
          <Grid item xs={12} sm={6} md={4} key={b._id}>
            <Card elevation={1} sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              transition: 'all 0.2s ease',
              '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-2px)' }
            }}>
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Booking ID: {b._id.slice(-8)}
                  </Typography>
                  <Chip
                    label={b.status || 'Pending'}
                    size="small"
                    color={getStatusColor(b.status)}
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon color="action" fontSize="small" />
                    <Typography>
                      {new Date(b.appointmentDate).toLocaleDateString()}
                      <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                        {new Date(b.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <ReceiptIcon color="action" fontSize="small" />
                    <Typography>
                      {b.items?.length || 0} package{b.items?.length !== 1 ? 's' : ''}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <PaymentIcon color="action" fontSize="small" />
                    <Typography fontWeight={600}>
                      {currency(b.totalAmount || 0)}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setSelected(b)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
          py: 2,
          pr: 6
        }}>
          <Typography variant="h6" fontWeight={700}>
            <ReceiptIcon color="primary" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Booking Details
          </Typography>
          <IconButton onClick={() => setSelected(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
          {selected && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                    <Typography>{selected._id}</Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selected.status || 'Pending'}
                      size="small"
                      color={getStatusColor(selected.status)}
                      sx={{ width: 'fit-content', fontWeight: 600 }}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Appointment Date</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EventIcon color="action" fontSize="small" />
                      <Typography>{new Date(selected.appointmentDate).toLocaleDateString()}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
                      {new Date(selected.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                    <Typography>{selected.payment?.method === 'ONLINE' ? 'Online Payment' : 'Pay at Center'}</Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Patient Name</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonIcon color="action" fontSize="small" />
                      <Typography>{selected.patientName || '—'}</Typography>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.secondary">Patient Email</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon color="action" fontSize="small" />
                      <Typography>{selected.patientEmail}</Typography>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Packages
                </Typography>
                <List
                  dense
                  sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
                >
                  {(selected.items || []).map((it, i) => (
                    <ListItem key={i} divider={i < selected.items.length - 1} sx={{ py: 1.5 }}>
                      <ListItemText
                        primary={it.packageName}
                        secondary={`Includes ${it.testsCount || 0} tests`}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                        × {it.quantity}
                      </Typography>
                      <Typography fontWeight={600}>
                        {currency(it.unitPrice)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>
                  Total Amount
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {currency(selected.totalAmount || 0)}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 2, px: 3 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={downloadPDF}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            onClick={() => setSelected(null)}
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

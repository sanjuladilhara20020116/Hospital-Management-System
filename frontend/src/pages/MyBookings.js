import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Card, CardContent, Chip, Divider,
  Grid, Stack, List, ListItem, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, CircularProgress, useTheme,
  Alert
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
  Download as DownloadIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://localhost:5000';
const USER_ID = 'demo-user-1'; // <<< must match Cart & HealthcarePackages

// Put your logo in /public/logo.png (or .jpg/.webp). Update path if needed.
const LOGO_URL = '/Blue and White Simple Medical Health Logo.png';

export default function MyBookings() {
  const theme = useTheme();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setStatus('Loading your bookings…');
      const res = await fetch(`${API_BASE}/api/bookings/mine`, {
        headers: { 'x-user-id': USER_ID } // <<< IMPORTANT
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

  // --- helpers for PDF/logo ---
  const hexToRgb = (hex) => {
    const s = hex.replace('#', '');
    const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    const n = parseInt(v, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

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

  // --- Styled PDF generation with logo in header ---
  const downloadPDF = async () => {
    if (!selected) return;

    // colors from theme
    const primaryHex = theme.palette.primary.main;
    const textHex = '#222222';
    const mutedHex = '#666666';
    const borderHex = '#DDDFE3';

    const primary = hexToRgb(primaryHex);
    const border = hexToRgb(borderHex);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header band
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageWidth, 90, 'F');

    // Try to load & add logo (safe handling)
    try {
      const logo = await loadLogo(LOGO_URL);
      if (logo?.dataURL && logo?.format) {
        // Fit within 130x50 box at (40,20)
        doc.addImage(logo.dataURL, logo.format, 40, 20, 130, 65);
      }
    } catch (err) {
      console.warn('Logo addImage failed — skipping logo.', err);
      // continue silently
    }

    // Title + ID (right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor('#ffffff');
    doc.text('Booking Details', pageWidth - 40, 42, { align: 'right' });
    doc.setFontSize(11);
    doc.text(`ID: ${selected._id}`, pageWidth - 40, 62, { align: 'right' });

    // Info box
    let y = 120;
    doc.setDrawColor(border.r, border.g, border.b);
    doc.setLineWidth(1);
    doc.roundedRect(40, y - 10, pageWidth - 80, 110, 6, 6);

    doc.setTextColor(textHex);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 54, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedHex);

    const dateStr = new Date(selected.appointmentDate).toLocaleDateString();
    const timeStr = new Date(selected.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const method = selected.payment?.method === 'ONLINE' ? 'Online Payment' : 'Pay at Center';

    const lines = [
      ['Status:', selected.status || 'Pending'],
      ['Appointment:', `${dateStr} ${timeStr}`],
      ['Payment Method:', method],
      ['Patient Name:', selected.patientName || '—'],
      ['Patient Email:', selected.patientEmail || '—'],
    ];

    // 2-column layout inside box
    let leftX = 54, rightX = pageWidth / 2 + 10;
    let rowY = y + 28;
    const rowGap = 18;

    lines.forEach((pair, i) => {
      const [label, value] = pair;
      const useRight = i >= Math.ceil(lines.length / 2);
      const x = useRight ? rightX : leftX;
      if (useRight && i === Math.ceil(lines.length / 2)) rowY = y + 28;

      doc.setTextColor(mutedHex);
      doc.setFont('helvetica', 'bold');
      doc.text(label, x, rowY);

      doc.setTextColor(textHex);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), x + 110, rowY);

      rowY += rowGap;
    });

    // Items table
    const startY = y + 130;
    autoTable(doc, {
      startY,
      margin: { left: 40, right: 40 },
      head: [['Package', 'Tests', 'Qty', 'Unit (Rs.)', 'Subtotal (Rs.)']],
      body: (selected.items || []).map(it => ([
        it.packageName,
        String(it.testsCount || 0),
        String(it.quantity),
        Number(it.unitPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
        Number(it.unitPrice * it.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })
      ])),
      styles: {
        font: 'helvetica',
        fontSize: 11,
        cellPadding: 8,
        lineColor: borderHex,
        lineWidth: 0.6,
        textColor: '#1f2937'
      },
      headStyles: {
        fillColor: primary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: { fillColor: '#f8fafc' },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center', cellWidth: 60 },
        3: { halign: 'right', cellWidth: 110 },
        4: { halign: 'right', cellWidth: 130 }
      }
    });

    // Total box
    const afterTableY = doc.lastAutoTable.finalY + 20;
    doc.setDrawColor(border.r, border.g, border.b);
    doc.roundedRect(pageWidth - 240, afterTableY, 200, 60, 6, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#666666');
    doc.text('Total Amount', pageWidth - 230, afterTableY + 22);
    doc.setTextColor(primaryHex);
    doc.setFontSize(16);
    doc.text(
      `Rs. ${Number(selected.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      pageWidth - 230,
      afterTableY + 45
    );

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(border.r, border.g, border.b);
    doc.line(40, footerY - 12, pageWidth - 40, footerY - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#666666');
    doc.text(`Generated on ${new Date().toLocaleString()}`, 40, footerY);
    doc.text('My Health Packages', pageWidth - 40, footerY, { align: 'right' });

    doc.save(`booking_${selected._id}.pdf`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
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
        {list.map(b => (
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
                      Rs. {Number(b.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                        Rs. {Number(it.unitPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                  Rs. {Number(selected.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Stack,
  InputAdornment, TableContainer, Tabs, Tab, Chip, Fab
} from '@mui/material';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import NumbersOutlined from '@mui/icons-material/NumbersOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LabAnalysisTab from '../components/LabAnalysisTab';

const API = axios.create({ baseURL: 'http://localhost:5000' });

const TEST_TYPES = [
  'Cholesterol','Diabetes','X-ray','Full Blood Count',
  'Liver Function','Kidney Function','Other'
];

/* ---- helpers for pretty labels ---- */
const pillStyles = {
  base: {
    px: 1.5, py: 0.5, borderRadius: 999, fontWeight: 700, fontSize: 12, letterSpacing: .3,
    textTransform: 'uppercase'
  },
  xray: { bg: '#FEF5E7', color: '#B7791F', border: '#F6E05E' },
  diabetes: { bg: '#E6FFFA', color: '#0D9488', border: '#5EEAD4' },
  cholesterol: { bg: '#FDF2F8', color: '#BE185D', border: '#F9A8D4' }
};
function TestTypePill({ type }) {
  const key = (type || '').toLowerCase().includes('x-ray')
    ? 'xray'
    : (type || '').toLowerCase().includes('diab') ? 'diabetes' : 'cholesterol';
  const k = pillStyles[key];
  return (
    <Box sx={{ ...pillStyles.base, bgcolor: k.bg, color: k.color, border: `1px solid ${k.border}`, display:'inline-block' }}>
      {type}
    </Box>
  );
}

function StatusPill({ ok }) {
  return (
    <Box sx={{
      display:'inline-flex', alignItems:'center', gap:.75,
      px:1.5, py:.75, borderRadius: 999, fontWeight:700, fontSize:12,
      bgcolor: ok ? '#F0FFF4' : '#FFF7ED', color: ok ? '#22543D' : '#7C2D12',
      border: `1px solid ${ok ? '#68D391' : '#FDBA74'}`
    }}>
      {ok ? '✓' : '•'} {ok ? 'Available' : 'Pending'}
    </Box>
  );
}

/* ---- Tabs label ---- */
function TabLabel({ icon, text, count, active }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.2}>
      {icon}
      <Typography sx={{ fontWeight: 700 }}>{text}</Typography>
      <Box sx={{
        px:1, borderRadius: 999, fontSize:12, fontWeight:700,
        color:'#fff', bgcolor: active ? '#7445B2' : '#7C89F6', minWidth:20, textAlign:'center'
      }}>{count}</Box>
    </Stack>
  );
}
function TabPanel({ value, index, children }) {
  return <Box role="tabpanel" hidden={value !== index} sx={{ p: 0, pt: 2 }}>{value === index && children}</Box>;
}

/* ---- Table ---- */
function ReportTable({ rows, onDownload, maxHeight = 520 }) {
  return (
    <Paper sx={{
      borderRadius: 3, overflow: 'hidden',
      bgcolor: 'rgba(255,255,255,.96)', border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 20px 40px rgba(0,0,0,.1)', backdropFilter: 'blur(20px)'
    }}>
      <TableContainer sx={{ maxHeight, overflowY:'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor:'#F8FAFC', color:'#475569', fontWeight:700, fontSize:14 }}}>
              <TableCell>Reference</TableCell>
              <TableCell>Test Type</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No reports found
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.referenceNo || r._id} hover
                sx={{
                  '&:hover': { bgcolor: 'rgba(118,75,162,0.02)' },
                  '& td': { py: 2.25 }
                }}>
                <TableCell sx={{ fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
                  bgcolor:'#F8FAFC', borderRadius:2, fontWeight:700 }}>
                  {r.referenceNo || r._id}
                </TableCell>
                <TableCell><TestTypePill type={r.testType} /></TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight:700 }}>
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}
                  </Typography>
                  <Typography sx={{ fontSize:12, color:'#64748B' }}>
                    {r.completedAt ? new Date(r.completedAt).toLocaleTimeString() : ''}
                  </Typography>
                </TableCell>
                <TableCell><StatusPill ok={!!r.hasReport} /></TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => onDownload(r)}
                    disabled={!r.portalDownloadUrl && !r.downloadUrl}
                    sx={{
                      px: 2, py: 1, borderRadius: 2, fontWeight: 700,
                      color:'#fff',
                      background: 'linear-gradient(135deg,#667eea,#764ba2)',
                      textTransform: 'none',
                      '&:hover': { boxShadow:'0 6px 20px rgba(118,75,162,.35)', transform:'translateY(-1px)' }
                    }}
                  >
                    ↓ Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default function MyLabReports() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  // ✅ derive a useful patient ObjectId for analyze endpoint
  const patientObjectId = useMemo(() => {
    return user?._id || user?.mongoId || user?.id || user?.patientId || null;
  }, [user]);

  // backend base for /api calls inside LabAnalysisTab
  const apiBase = 'http://localhost:5000/api';

  const [filters, setFilters] = useState({ testType: '', ref: '', dateFrom: '', dateTo: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0); // 0=new, 1=read, 2=analysis

  const fetchReports = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const params = {};
      if (filters.testType) params.testType = filters.testType;
      if (filters.ref) params.ref = filters.ref.trim();
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await API.get(`/api/users/${encodeURIComponent(user.userId)}/reports`, { params });
      setRows(res.data?.items || []);
    } catch (e) {
      console.error('load reports failed', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, filters]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const clearFilters = () => {
    setFilters({ testType: '', ref: '', dateFrom: '', dateTo: '' });
    setTimeout(fetchReports, 0);
  };

  const handleDownload = (r) => {
    const url = r.portalDownloadUrl || r.downloadUrl;
    if (!url) return;
    window.location.href = `http://localhost:5000${url}`;
  };

  // derive new vs read for your table tabs
  const newReports = rows.filter(r => (typeof r.isNew === 'boolean') ? r.isNew : !!r.hasReport);
  const readReports = rows.filter(r => (typeof r.isNew === 'boolean') ? !r.isNew : false);

  // ✅ normalize rows for the analysis tab (ensuring an id and dates)
  const reportCards = useMemo(() => {
    return (rows || []).map((r) => ({
      _id: r._id || r.labReportId || r.referenceNo, // analysis expects LabReport _id ideally
      testType: r.testType,
      uploadDate: r.completedAt || r.uploadDate || null,
      completedAt: r.completedAt || null,
      isAnalyzed: !!r.isAnalyzed,
      hasReport: r.hasReport ?? true,
      fileName: r.fileName || r.originalName || `${r.testType || 'Report'}_${r.referenceNo || ''}.pdf`,
      referenceNo: r.referenceNo,
      portalDownloadUrl: r.portalDownloadUrl,
      downloadUrl: r.downloadUrl,
    }));
  }, [rows]);

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffffffff 0%, #ebeff7ff 100%)',
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover',
      py: 3
    }}>
      <Container maxWidth="xl">
        {/* Header card */}
        <Paper sx={{
          p: 3, mb: 3, borderRadius: 3,
          bgcolor: 'rgba(255,255,255,.95)', border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,.1)', backdropFilter: 'blur(20px)'
        }}>
          <Button
            startIcon={<ArrowBackIosNew />}
            onClick={() => navigate('/dashboard')}
            sx={{
              mb: 2, borderRadius: 2, fontWeight: 700, color:'#667eea',
              background:'rgba(102,126,234,.12)', textTransform:'none',
              '&:hover': { background:'rgba(102,126,234,.2)', transform:'translateX(-2px)' }
            }}
          >
            Back to Dashboard
          </Button>

          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Typography sx={{
              fontSize: { xs: 28, sm: 36 }, fontWeight: 800,
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
            }}>
              My Lab Reports
            </Typography>
            <Chip
              label={loading ? 'Loading…' : `${rows.length} total`}
              sx={{
                px: 1.5, py: 1, color:'#fff',
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                fontWeight: 700, borderRadius: 999
              }}
            />
          </Stack>
        </Paper>

        {/* Filters card */}
        <Paper sx={{
          p: 3, mb: 3, borderRadius: 3,
          bgcolor: 'rgba(255,255,255,.95)', border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,.1)', backdropFilter: 'blur(20px)'
        }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Search Your Lab Reports
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              select fullWidth label="Test Type" value={filters.testType}
              onChange={e => setFilters(f => ({ ...f, testType: e.target.value }))}
              InputProps={{ startAdornment: (<InputAdornment position="start"><ScienceOutlined fontSize="small" /></InputAdornment>) }}
            >
              <MenuItem value="">All Tests</MenuItem>
              {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>

            <TextField
              fullWidth label="Reference No" placeholder="Enter reference number"
              value={filters.ref}
              onChange={e => setFilters(f => ({ ...f, ref: e.target.value }))}
              InputProps={{ startAdornment: (<InputAdornment position="start"><NumbersOutlined fontSize="small" /></InputAdornment>) }}
            />

            <TextField
              fullWidth type="date" label="From Date" InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              InputProps={{ startAdornment: (<InputAdornment position="start"><CalendarMonthOutlined fontSize="small" /></InputAdornment>) }}
            />
            <TextField
              fullWidth type="date" label="To Date" InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              InputProps={{ startAdornment: (<InputAdornment position="start"><CalendarMonthOutlined fontSize="small" /></InputAdornment>) }}
            />
          </Stack>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={clearFilters}
              sx={{ px: 2.5, py: 1.1, borderRadius: 2, fontWeight:700, textTransform:'none' }}>
              × Clear
            </Button>
            <Button onClick={fetchReports} disabled={loading}
              sx={{
                px: 2.8, py: 1.1, borderRadius: 2, fontWeight:700, color:'#fff',
                background: 'linear-gradient(135deg,#667eea,#764ba2)', textTransform:'none',
                '&:hover': { boxShadow:'0 8px 24px rgba(102,126,234,.35)', transform:'translateY(-1px)' }
              }}>
              ✓ Apply
            </Button>
          </Stack>
        </Paper>

        {/* Reports + Tabs */}
        <Paper sx={{
          p: 0, borderRadius: 3,
          bgcolor: 'rgba(255,255,255,.95)', border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 20px 40px rgba(0,0,0,.1)', backdropFilter: 'blur(20px)'
        }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              px: 1, borderBottom: '1px solid #E2E8F0',
              '& .MuiTab-root': {
                textTransform:'none', py: 2, fontWeight:700, color:'#718096',
                '&.Mui-selected': { color:'#667eea', background:'rgba(102,126,234,.06)' }
              },
              '& .MuiTabs-indicator': { display:'none' }
            }}
          >
            <Tab
              value={0}
              label={
                <TabLabel
                  icon={<FolderOpenOutlined fontSize="small" />}
                  text="New Reports"
                  count={newReports.length}
                  active={tab === 0}
                />
              }
            />
            <Tab
              value={1}
              label={
                <TabLabel
                  icon={<TaskAltOutlined fontSize="small" />}
                  text="Read / Downloaded"
                  count={readReports.length}
                  active={tab === 1}
                />
              }
            />
            <Tab
              value={2}
              icon={<InsightsOutlined fontSize="small" />}
              iconPosition="start"
              label="Report Analysis"
            />
          </Tabs>

          <Box sx={{ p: 2 }}>
            <TabPanel value={tab} index={0}>
              <ReportTable rows={newReports} onDownload={handleDownload} />
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <ReportTable rows={readReports} onDownload={handleDownload} />
            </TabPanel>

            {/* ✅ Analysis panel wired with patientId and apiBase */}
            <TabPanel value={tab} index={2}>
              <LabAnalysisTab
  reports={reportCards}
   patientId={patientObjectId}
  apiBase="http://localhost:5000/api"
/>

            </TabPanel>
          </Box>
        </Paper>

        {/* Floating refresh action */}
        <Fab
          color="primary"
          onClick={fetchReports}
          sx={{
            position:'fixed', right: 28, bottom: 28,
            bgcolor: 'linear-gradient(135deg,#667eea,#764ba2)',
            backgroundImage: 'linear-gradient(135deg,#667eea,#764ba2)',
            color:'#fff',
            boxShadow:'0 10px 30px rgba(102,126,234,.45)',
            '&:hover': { transform:'scale(1.06)', boxShadow:'0 16px 40px rgba(102,126,234,.6)' }
          }}
        >
          <AutorenewRounded />
        </Fab>
      </Container>
    </Box>
  );
}

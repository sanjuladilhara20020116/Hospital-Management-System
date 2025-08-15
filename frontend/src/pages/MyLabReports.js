// src/pages/MyLabReports.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Stack,
  InputAdornment
} from '@mui/material';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import NumbersOutlined from '@mui/icons-material/NumbersOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ArrowBackIosNew from '@mui/icons-material/ArrowBackIosNew';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = axios.create({ baseURL: 'http://localhost:5000' });

const TEST_TYPES = [
  'Cholesterol','Diabetes','X-ray','Full Blood Count',
  'Liver Function','Kidney Function','Other'
];

export default function MyLabReports() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const [filters, setFilters] = useState({
    testType: '',
    ref: '',
    dateFrom: '',
    dateTo: ''
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [user?.userId, filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const clearFilters = () => {
    setFilters({ testType: '', ref: '', dateFrom: '', dateTo: '' });
    setTimeout(fetchReports, 0);
  };

  const download = (r) => {
    if (!r?.downloadUrl) return;
    window.location.href = `http://localhost:5000${r.downloadUrl}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<ArrowBackIosNew />} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Typography variant="h5" fontWeight={700}>My Lab Reports</Typography>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            fullWidth
            label="Test Type"
            value={filters.testType}
            onChange={e => setFilters(f => ({ ...f, testType: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ScienceOutlined fontSize="small" />
                </InputAdornment>
              )
            }}
          >
            <MenuItem value="">All Types</MenuItem>
            {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>

          <TextField
            fullWidth
            label="Reference No"
            value={filters.ref}
            onChange={e => setFilters(f => ({ ...f, ref: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <NumbersOutlined fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <TextField
            fullWidth
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthOutlined fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthOutlined fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button variant="outlined" onClick={clearFilters}>Clear</Button>
            <Button variant="contained" onClick={fetchReports} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>Test Type</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Report</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No reports found
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.referenceNo} hover>
                <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {r.referenceNo}
                </TableCell>
                <TableCell>{r.testType}</TableCell>
                <TableCell>
                  {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell>
                  {r.hasReport
                    ? <Chip size="small" color="success" label="Available" />
                    : <Chip size="small" color="warning" label="Pending" />}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => download(r)}
                    disabled={!r.downloadUrl}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}

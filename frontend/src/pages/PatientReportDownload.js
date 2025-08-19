// src/pages/PatientReportDownload.jsx
import React, { useEffect, useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import axios from 'axios';


const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const API = axios.create({ baseURL: API_BASE });

export default function PatientReportDownload() {
  const [ref, setRef] = useState('');
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');

  const lookup = async (refArg) => {
    setErr('');
    setMeta(null);
    const value = (refArg ?? ref).trim();
    if (!value) return setErr('Enter your reference number');
    try {
      const res = await API.get(`/api/public/reports/${encodeURIComponent(value)}`);
      setMeta(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Report not found');
    }
  };

  const download = () => {
    const value = ref.trim();
    if (!value) return setErr('Enter your reference number');
    window.location.href = `${API_BASE}/api/public/reports/${encodeURIComponent(value)}/download`;
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('ref');
    if (r) {
      setRef(r);
      lookup(r);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: 520 }}>
        <Typography variant="h6" gutterBottom>Download Lab Report</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your <b>Reference No</b> from the email to download your report.
        </Typography>
        <TextField
          fullWidth
          label="Reference No (e.g., LB-2025-08-000123)"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={() => lookup()}>Find Report</Button>

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}

        {meta && (
          <Box sx={{ mt: 2 }}>
            <Typography><b>Test:</b> {meta.testType}</Typography>
            <Typography><b>Completed:</b> {new Date(meta.completedAt).toLocaleString()}</Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={download}>
              Download PDF/Image
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

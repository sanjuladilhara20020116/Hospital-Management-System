// src/pages/PatientReportDownload.jsx
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Fade,
  Container
} from '@mui/material';
import { 
  Search, 
  Download, 
  Description, 
  CalendarToday,
  LocalHospital 
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const API = axios.create({ baseURL: API_BASE });

export default function PatientReportDownload() {
  const [ref, setRef] = useState('');
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = async (refArg) => {
    setErr('');
    setMeta(null);
    setLoading(true);
    const value = (refArg ?? ref).trim();
    if (!value) {
      setLoading(false);
      return setErr('Enter your reference number');
    }
    try {
      const res = await API.get(`/api/public/reports/${encodeURIComponent(value)}`);
      setMeta(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Report not found');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const value = ref.trim();
    if (!value) return setErr('Enter your reference number');
    window.location.href = `${API_BASE}/api/public/reports/${encodeURIComponent(value)}/download`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      lookup();
    }
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
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Fade in timeout={500}>
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: 'linear-gradient(145deg, #f5f7ff 0%, #ffffff 100%)',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LocalHospital 
              sx={{ 
                fontSize: 48, 
                color: 'primary.main',
                mb: 1
              }} 
            />
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 600,
                background: 'linear-gradient(45deg, #1976d2, #00bcd4)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Download Lab Report
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Enter your <b style={{ color: '#1976d2' }}>Reference Number</b> from the email to access your laboratory report
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Reference Number (e.g., LB-2025-08-000123)"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
              InputProps={{
                startAdornment: <Description sx={{ color: 'text.secondary', mr: 1 }} />
              }}
            />
            
            <Button 
              variant="contained" 
              onClick={() => lookup()}
              disabled={loading}
              startIcon={<Search />}
              sx={{
                py: 1.5,
                px: 3,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                }
              }}
            >
              {loading ? 'Searching...' : 'Find Report'}
            </Button>
          </Box>

          {loading && (
            <LinearProgress 
              sx={{ 
                borderRadius: 2, 
                height: 6,
                mb: 2 
              }} 
            />
          )}

          {err && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 2, 
                borderRadius: 2,
                alignItems: 'center'
              }}
            >
              {err}
            </Alert>
          )}

          {meta && (
            <Fade in timeout={700}>
              <Card 
                sx={{ 
                  mt: 3, 
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: 'success.light',
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      color: 'success.dark',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <LocalHospital /> Report Found
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Description sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                      <Typography variant="body1">
                        <b>Test Type:</b> {meta.testType}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarToday sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                      <Typography variant="body1">
                        <b>Completed:</b> {new Date(meta.completedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>

                  <Button 
                    variant="contained" 
                    onClick={download}
                    startIcon={<Download />}
                    sx={{
                      py: 1.5,
                      px: 4,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(45deg, #388e3c, #66bb6a)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #2e7d32, #4caf50)',
                      }
                    }}
                  >
                    Download Report (PDF/Image)
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          )}
        </Paper>
      </Fade>
    </Container>
  );
}
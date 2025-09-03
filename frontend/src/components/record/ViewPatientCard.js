
import React, { useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Avatar, Stack, Chip, Divider, Alert, CircularProgress
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function ViewPatientCard() {
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    setError("");
    setResult(null);

    const id = patientId.trim();
    if (!id) return setError("Please enter a valid Patient ID");

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(id)}`);
      if (!res?.data || res.data.role !== "Patient") {
        setError("Patient not found");
      } else {
        setResult(res.data);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Patient not found");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = () => {
    if (!result?.userId) return;
    navigate(`/doctor/patients/${encodeURIComponent(result.userId)}`);
  };

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          View Patient
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Search by Patient ID to open records
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Enter Patient ID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="contained" onClick={handleSearch} disabled={loading} sx={{ px: 3 }}>
            {loading ? <CircularProgress size={22} /> : "Search"}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ p: 2, borderRadius: 2, border: (t) => `1px solid ${t.palette.divider}` }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={result.photo ? `${API_BASE}/uploads/${result.photo}` : undefined}
                sx={{ width: 56, height: 56 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800}>
                  {result.firstName} {result.lastName}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip size="small" label={result.userId} />
                  {result.age != null && (
                    <Typography variant="body2" color="text.secondary">
                      {result.age} yr
                    </Typography>
                  )}
                  {result.gender && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      {result.gender}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Button variant="contained" onClick={handleOpenProfile}>
              Open Profile
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

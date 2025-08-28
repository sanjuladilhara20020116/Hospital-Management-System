import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

// MUI
import {
  Container, Paper, Typography, ToggleButtonGroup, ToggleButton,
  TextField, Button, Stack, Alert, Card, CardContent, Grid,
  Chip, Divider, Box, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import ClearIcon from "@mui/icons-material/Clear";

export default function DoctorVaccinationSearch() {
  const [mode, setMode] = useState("id"); // 'id' | 'nic'
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [patient, setPatient] = useState(null);
  const navigate = useNavigate();

  async function onSearch(e) {
    e.preventDefault();
    setErr("");
    setPatient(null);
    const trimmed = q.trim();
    if (!trimmed) {
      setErr("Enter a Patient ID or NIC to search.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.get("/api/user-lookup", {
        params: mode === "id" ? { userId: trimmed } : { nic: trimmed },
      });
      setPatient(data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function createVaccination() {
    if (!patient?.userId) return;
    navigate(`/vaccinations/new?patientUserId=${encodeURIComponent(patient.userId)}`);
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Vaccination — Find Patient
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search by Patient ID (e.g., <b>P2025/898/16</b>) or NIC to verify the patient,
        then proceed to create the vaccination certificate.
      </Typography>

      <Paper sx={{ p: 2.5, mb: 3 }} component="form" onSubmit={onSearch} elevation={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <ToggleButtonGroup
            color="primary"
            value={mode}
            exclusive
            onChange={(_, val) => val && setMode(val)}
            size="small"
          >
            <ToggleButton value="id">By Patient ID</ToggleButton>
            <ToggleButton value="nic">By NIC</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth
            label={mode === "id" ? "Patient ID" : "NIC"}
            placeholder={mode === "id" ? "P2025/898/16" : "200429013230"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </Stack>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Paper>

      {patient && (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {patient.firstName} {patient.lastName}{" "}
                <Typography component="span" color="text.secondary">({patient.userId})</Typography>
              </Typography>
              <Chip label="Patient" size="small" />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><b>NIC:</b> {patient.nicNumber || "-"}</Grid>
              <Grid item xs={12} sm={6}><b>Gender:</b> {patient.gender || "-"}</Grid>
              <Grid item xs={12} sm={6}><b>Age:</b> {patient.age ?? "-"}</Grid>
              <Grid item xs={12} sm={6}>
                <b>DOB:</b> {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "-"}
              </Grid>
              <Grid item xs={12} sm={6}><b>Email:</b> {patient.email || "-"}</Grid>
              <Grid item xs={12} sm={6}><b>Phone:</b> {patient.contactNumber || "-"}</Grid>
              <Grid item xs={12}><b>Address:</b> {patient.address || "-"}</Grid>
              <Grid item xs={12}>
                <b>Allergies:</b>{" "}
                {patient.allergies?.length
                  ? patient.allergies.map((a, i) => <Chip key={i} label={a} sx={{ mr: 0.5, mt: 0.5 }} />)
                  : "-"}
              </Grid>
              <Grid item xs={12}>
                <b>Medical History:</b>{" "}
                {patient.medicalHistory?.length
                  ? patient.medicalHistory.map((m, i) => <Chip key={i} label={m} sx={{ mr: 0.5, mt: 0.5 }} />)
                  : "-"}
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<VaccinesIcon />}
                onClick={createVaccination}
              >
                Create Vaccination
              </Button>
              <Button variant="text" startIcon={<ClearIcon />} onClick={() => setPatient(null)}>
                Clear
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

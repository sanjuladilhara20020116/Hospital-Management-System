// src/pages/record/PatientMedicalRecords.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Divider,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

import AllergiesCard from "../../components/record/AllergiesCard";
import MedicalRecordsHub from "../../components/record/MedicalRecordsHub";

const API_BASE = "http://localhost:5000";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PatientMedicalRecords() {
  const viewer = getCurrentUser(); // expects { userId, role, ... }
  const patientId = viewer?.userId;

  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState("");

  // Allergies state
  const [allergies, setAllergies] = useState([]);
  const [allergyErr, setAllergyErr] = useState("");
  const [allergyLoading, setAllergyLoading] = useState(false);

  // Load own profile (patient)
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        setErr("");
        const res = await axios.get(
          `${API_BASE}/api/users/${encodeURIComponent(patientId)}`
        );
        if (!res?.data || res.data.role !== "Patient") {
          throw new Error("Patient not found");
        }
        setProfile(res.data);
      } catch (e) {
        setErr(e?.response?.data?.message || "Patient not found");
      }
    })();
  }, [patientId]);

  // Load allergies for this patient
  useEffect(() => {
    if (!profile?.userId) return;
    (async () => {
      try {
        setAllergyErr("");
        setAllergyLoading(true);
        const res = await axios.get(
          `${API_BASE}/api/patients/${encodeURIComponent(
            profile.userId
          )}/allergies`
        );
        setAllergies(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch (e) {
        setAllergyErr(e?.response?.data?.message || "Failed to load allergies");
      } finally {
        setAllergyLoading(false);
      }
    })();
  }, [profile?.userId]);

  if (!patientId) {
    return (
      <Alert severity="error" sx={{ m: 3, borderRadius: 2 }}>
        You must be logged in as a patient to view medical records.
      </Alert>
    );
  }

  if (err) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {err}
        </Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      {/* Header (like PatientDetails but for self) */}
      <Card
        elevation={0}
        sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={profile.photo ? `${API_BASE}/uploads/${profile.photo}` : undefined}
              sx={{ width: 72, height: 72 }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                {profile.firstName} {profile.lastName}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                <Chip size="small" label={profile.userId} />
                {profile.age != null && <Chip size="small" label={`${profile.age} yr`} />}
                {profile.gender && <Chip size="small" label={profile.gender} />}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Allergies (read-only for patient) */}
      <Box sx={{ mt: 3 }}>
        {allergyErr && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {allergyErr}
          </Alert>
        )}
        <AllergiesCard
          loading={allergyLoading}
          items={allergies.map((a) => ({
            id: a._id,
            substance: a.substance,
            reaction: a.reaction,
            severity: a.severity,
            notedOn: a.notedOn,
            notes: a.notes,
          }))}
          isDoctor={false} // ✅ patient can't add/edit/delete
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Medical Records Hub (LAB tab hidden for patient) */}
      <MedicalRecordsHub
        patientId={profile.userId}
        isDoctor={false}  // ✅ no add/edit/delete buttons
        hideLab           // ✅ completely hide LAB Reports tab
      />
    </Box>
  );
}

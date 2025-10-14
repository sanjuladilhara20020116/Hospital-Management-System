// src/pages/record/PatientDetails.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Divider,
  Button,
  Alert,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import AllergiesCard from "../../components/record/AllergiesCard";
import MedicalRecordsHub from "../../components/record/MedicalRecordsHub";

const API_BASE = "http://localhost:5000";
const BLUE = "#1565C0";
const BLUE_SOFT = "#E3F2FD"; // ← page background (light blue)

// ─────────────────────────────────────────────────────────────────────────────
// helpers (unchanged)
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PatientDetails() {
  const { patientId } = useParams(); // route param (can be userId or _id in your app)
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // Allergies state
  const [allergies, setAllergies] = useState([]);
  const [allergyErr, setAllergyErr] = useState("");
  const [allergyLoading, setAllergyLoading] = useState(false);

  const viewer = getCurrentUser();
  const isDoctor = viewer?.role === "Doctor";

  // fetch patient info (expects :patientId to be userId code)
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await axios.get(
          `${API_BASE}/api/users/${encodeURIComponent(patientId)}`
        );
        if (!res?.data || res.data.role !== "Patient")
          throw new Error("Patient not found");
        setData(res.data);
      } catch (e) {
        setErr(e?.response?.data?.message || "Patient not found");
      }
    })();
  }, [patientId]);

  // fetch allergies (these APIs use userId code)
  useEffect(() => {
    if (!data?.userId) return;
    (async () => {
      try {
        setAllergyErr("");
        setAllergyLoading(true);
        const res = await axios.get(
          `${API_BASE}/api/patients/${encodeURIComponent(data.userId)}/allergies`
        );
        setAllergies(Array.isArray(res.data?.items) ? res.data.items : []);
      } catch (e) {
        setAllergyErr(e?.response?.data?.message || "Failed to load allergies");
      } finally {
        setAllergyLoading(false);
      }
    })();
  }, [data?.userId]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ---- Allergies CRUD (unchanged) ----
  const onAllergyCreate = async (payload) => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/patients/${encodeURIComponent(data.userId)}/allergies`,
        payload,
        { headers: { ...authHeaders() } }
      );
      setAllergies((prev) => [res.data.item, ...prev]);
    } catch (e) {
      setAllergyErr(e?.response?.data?.message || "Unable to create allergy");
    }
  };

  const onAllergyUpdate = async (id, payload) => {
    try {
      const res = await axios.put(
        `${API_BASE}/api/allergies/${encodeURIComponent(id)}`,
        payload,
        { headers: { ...authHeaders() } }
      );
      setAllergies((prev) =>
        prev.map((a) => (String(a._id) === String(id) ? res.data.item : a))
      );
    } catch (e) {
      setAllergyErr(e?.response?.data?.message || "Unable to update allergy");
    }
  };

  const onAllergyDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/allergies/${encodeURIComponent(id)}`,
        { headers: { ...authHeaders() } }
      );
      setAllergies((prev) => prev.filter((a) => String(a._id) !== String(id)));
    } catch (e) {
      setAllergyErr(e?.response?.data?.message || "Unable to delete allergy");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // early returns
  if (err) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: BLUE_SOFT, py: 3 }}>
        <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {err}
          </Alert>
          <Button
            sx={{ mt: 2, color: BLUE, borderColor: BLUE }}
            onClick={() => navigate(-1)}
            variant="outlined"
          >
            Back
          </Button>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: BLUE_SOFT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
        }}
      >
        <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
          Loading…
        </Typography>
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI (primary white, secondary blue)
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BLUE_SOFT, py: { xs: 2, md: 4 } }}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
        {/* Header */}
        <Card
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          {/* thin blue top bar */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              bgcolor: BLUE,
            }}
          />
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              <Avatar
                src={data.photo ? `${API_BASE}/uploads/${data.photo}` : undefined}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: BLUE_SOFT,
                  border: "2px solid #fff",
                  boxShadow: `0 0 0 3px ${BLUE_SOFT}`,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ lineHeight: 1.15, color: "#0F172A" }}
                  noWrap
                >
                  {data.firstName} {data.lastName}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ mt: 1 }}
                  useFlexGap
                >
                  <Chip
                    size="small"
                    label={data.userId}
                    sx={{
                      bgcolor: BLUE_SOFT,
                      color: BLUE,
                      fontWeight: 700,
                      border: `1px solid ${BLUE}26`,
                    }}
                  />
                  {data.age != null && (
                    <Chip
                      size="small"
                      label={`${data.age} yr`}
                      variant="outlined"
                      sx={{ borderColor: BLUE, color: BLUE }}
                    />
                  )}
                  {data.gender && (
                    <Chip
                      size="small"
                      label={data.gender}
                      variant="outlined"
                      sx={{ borderColor: BLUE, color: BLUE }}
                    />
                  )}
                </Stack>
              </Box>

              <Button
                onClick={() => navigate(-1)}
                variant="outlined"
                sx={{
                  borderColor: BLUE,
                  color: BLUE,
                  px: 2.25,
                  "&:hover": { borderColor: BLUE, bgcolor: BLUE_SOFT },
                }}
              >
                Back
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Allergies section */}
        <Box sx={{ mt: 3 }}>
          <SectionTitle title="Allergies" />
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
            isDoctor={isDoctor}
            onCreate={onAllergyCreate}
            onUpdate={onAllergyUpdate}
            onDelete={onAllergyDelete}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Records hub */}
        <Box>
          <SectionTitle title="Medical Records" />
          <MedicalRecordsHub
            patientId={data.userId} // human code, e.g. P2025/...
            patientRefId={data._id} // Mongo _id
            isDoctor={isDoctor}
            onAdd={(activeKey) => {
              console.log("Add clicked for:", activeKey);
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/** Small internal section header with white/blue styling */
function SectionTitle({ title }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
      <Box
        sx={{
          width: 6,
          height: 24,
          borderRadius: 999,
          bgcolor: BLUE,
        }}
      />
      <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0F172A" }}>
        {title}
      </Typography>
    </Stack>
  );
}

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

/* ---- helpers ---- */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const BLUE = "#1565C0";
const LIGHT_BLUE = "#E9F3FF";

/* ======================= Component ======================= */
export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // Allergies state
  const [allergies, setAllergies] = useState([]);
  const [allergyErr, setAllergyErr] = useState("");
  const [allergyLoading, setAllergyLoading] = useState(false);

  const viewer = getCurrentUser();
  const isDoctor = viewer?.role === "Doctor";

  /* ---------- fetch patient ----------- */
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

  /* ---------- fetch allergies ----------- */
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

  /* ---------- Allergies CRUD (unchanged behavior) ----------- */
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

  /* ---------- early returns ----------- */
  if (err) {
    return (
      <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {err}
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
      </Box>
    );
  }

  if (!data) {
    return (
      <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
        Loading…
      </Typography>
    );
  }

  /* ---------- styles (internal CSS) ----------- */
  const styles = {
    page: { p: 3, maxWidth: 1100, mx: "auto" },
    headerCard: {
      position: "relative",
      borderRadius: 3,
      overflow: "hidden",
      bgcolor: "#fff",
      border: (t) => `1px solid ${t.palette.divider}`,
      /* blue top bar */
      "&:before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: 8,
        background: BLUE,
      },
    },
    avatar: {
      width: 88,
      height: 88,
      bgcolor: LIGHT_BLUE,
      border: "3px solid #E3F2FD",
      boxShadow: "0 0 0 4px #F5F9FF inset",
    },
    idChip: {
      px: 1.25,
      fontWeight: 700,
      bgcolor: LIGHT_BLUE,
      color: BLUE,
      borderColor: BLUE,
    },
    outlineChip: {
      px: 1.1,
      color: BLUE,
      borderColor: BLUE,
    },
    backBtn: {
      borderColor: BLUE,
      color: BLUE,
      fontWeight: 700,
      px: 2.5,
      "&:hover": { borderColor: BLUE, backgroundColor: LIGHT_BLUE },
    },
  };

  /* ---------- render ----------- */
  return (
    <Box sx={styles.page}>
      {/* Header */}
      <Card elevation={0} sx={styles.headerCard}>
        <CardContent sx={{ pt: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={data.photo ? `${API_BASE}/uploads/${data.photo}` : undefined}
              sx={styles.avatar}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                {data.firstName} {data.lastName}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <Chip size="small" sx={styles.idChip} label={data.userId} />
                {data.age != null && (
                  <Chip size="small" variant="outlined" sx={styles.outlineChip} label={`${data.age} yr`} />
                )}
                {data.gender && (
                  <Chip size="small" variant="outlined" sx={styles.outlineChip} label={data.gender} />
                )}
              </Stack>
            </Box>
            <Button variant="outlined" onClick={() => navigate(-1)} sx={styles.backBtn}>
              BACK
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Allergies (doctor editable) */}
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
          isDoctor={isDoctor}
          onCreate={onAllergyCreate}
          onUpdate={onAllergyUpdate}
          onDelete={onAllergyDelete}
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Medical Records hub */}
      <MedicalRecordsHub
        patientId={data.userId}  // human code, e.g. P2025/...
        patientRefId={data._id}  // Mongo _id
        isDoctor={isDoctor}
        onAdd={(activeKey) => {
          // keep same behavior (no functional changes)
          console.log("Add clicked for:", activeKey);
        }}
      />
    </Box>
  );
}

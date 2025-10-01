// frontend/src/pages/DoctorDashboard.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Avatar,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Chip,
  InputAdornment,
  Grid,
  useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import axios from "axios";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailIcon from "@mui/icons-material/Email";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import VaccinesIcon from "@mui/icons-material/Vaccines";

import ViewPatientCard from "../components/record/ViewPatientCard";

const API_BASE = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5000/api";
const UPLOADS_BASE =
  import.meta?.env?.VITE_UPLOADS_BASE_URL || "http://localhost:5000/uploads";

/**
 * Doctor Dashboard
 * - Shows doctor profile with edit/save/delete
 * - Quick CTA: Vaccination hub
 * - Quick CTA: My Appointments -> Set Availability dialog (POST /api/availability/doctor/day)
 * - Patient quick view card (ViewPatientCard)
 *
 * Notes:
 * - Expects backend role-gate headers: X-Role=Doctor, X-User-Id=<doctorId>
 * - Keeps /vaccinations/home as current search hub (align later if you switch to /vaccinations/search)
 */
export default function DoctorDashboard({ userId: propUserId }) {
  const theme = useTheme();

  // ---- state
  const [profile, setProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const [alert, setAlert] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Availability
  const todayStr = new Date().toISOString().slice(0, 10);
  const [availOpen, setAvailOpen] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState({
    date: todayStr,
    startTime: "09:00",
    endTime: "12:00",
    slotMinutes: 15,
    patientLimit: 20,
    hospital: "Asiri Central - Colombo",
  });

  // Derive userId (prop wins; fallback to localStorage user object if present)
  const userId =
    propUserId ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("user"));
        return u?.userId || u?._id || u?.id || "";
      } catch {
        return "";
      }
    })();

  // ---- helpers
  const showAlert = (severity, message) =>
    setAlert({ open: true, severity, message });

  // ---- effects
  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      if (!userId) {
        showAlert("warning", "No userId available to load profile.");
        return;
      }
      try {
        const res = await axios.get(`${API_BASE}/users/${encodeURIComponent(userId)}`);
        if (!isMounted) return;

        setProfile(res.data);
        setFormData(res.data);
        if (res.data?.photo) {
          setImagePreview(`${UPLOADS_BASE}/${res.data.photo}`);
        } else {
          setImagePreview(null);
        }
      } catch (err) {
        showAlert("error", err?.response?.data?.message || "Failed to load profile");
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // ---- profile edit handlers
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      const data = new FormData();
      Object.entries(formData || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null) data.append(k, v);
      });

      await axios.put(`${API_BASE}/users/${encodeURIComponent(userId)}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showAlert("success", "Profile updated successfully");
      setEditMode(false);

      const res = await axios.get(`${API_BASE}/users/${encodeURIComponent(userId)}`);
      setProfile(res.data);
      setFormData(res.data);
      if (res.data?.photo) {
        setImagePreview(`${UPLOADS_BASE}/${res.data.photo}`);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      showAlert("error", err?.response?.data?.message || "Failed to update profile");
    }
  };

  const handleDelete = async () => {
    if (!userId) return;

    try {
      await axios.delete(`${API_BASE}/users/${encodeURIComponent(userId)}`);
      showAlert("success", "Profile deleted. Logging out...");
      setTimeout(() => {
        localStorage.removeItem("user");
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      showAlert("error", err?.response?.data?.message || "Failed to delete profile");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // ---- availability
  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setAvailabilityForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveAvailability = async () => {
    if (!userId) {
      showAlert("warning", "No userId available for availability.");
      return;
    }
    const payload = {
      doctorId: userId,
      date: availabilityForm.date,
      startTime: availabilityForm.startTime,
      endTime: availabilityForm.endTime,
      slotMinutes: Number(availabilityForm.slotMinutes),
      patientLimit: Number(availabilityForm.patientLimit),
      hospital: availabilityForm.hospital,
    };

    try {
      setSavingAvailability(true);
      await axios.post(`${API_BASE}/availability/doctor/day`, payload, {
        headers: {
          "X-Role": "Doctor",
          "X-User-Id": String(userId),
        },
      });
      showAlert("success", "Availability saved");
      setAvailOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save availability";
      showAlert("error", msg);
    } finally {
      setSavingAvailability(false);
    }
  };

  if (!profile) {
    return (
      <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
        Loading...
      </Typography>
    );
  }

  const labelStyle = { fontWeight: 600, color: "text.secondary", minWidth: 180 };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", mt: 4, px: { xs: 2, sm: 3 }, pb: 6 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}22, ${theme.palette.success.light}22)`,
          border: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={imagePreview || undefined}
            alt={`${profile.firstName || ""} ${profile.lastName || ""}`}
            sx={{
              width: 84,
              height: 84,
              border: `3px solid ${theme.palette.background.paper}`,
              boxShadow: "0 10px 30px rgba(2,6,23,.15)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              bgcolor: "success.main",
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {profile.firstName} {profile.lastName}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={`User ID: ${profile.userId || "-"}`} />
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={profile.specialty || "General"}
              icon={<WorkspacePremiumIcon />}
            />
            <Chip
              size="small"
              variant="outlined"
              label={profile.email || "-"}
              icon={<EmailIcon />}
            />
          </Stack>
        </Box>

        {/* Action buttons */}
        <Stack direction="row" spacing={1}>
          {editMode ? (
            <>
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setEditMode(false)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* Vaccination hub */}
              <Button
                variant="contained"
                color="success"
                startIcon={<VaccinesIcon />}
                component={Link}
                to="/vaccinations/home"
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Vaccination
              </Button>

              {/* Set Availability / My Appointments */}
              <Button
                variant="contained"
                onClick={() => setAvailOpen(true)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                My Appointments
              </Button>

              <Button
                variant="contained"
                onClick={() => setEditMode(true)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Edit Profile
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleLogout}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Logout
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Profile Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 10px 30px rgba(2,6,23,.06)",
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Profile Details
          </Typography>
        </CardContent>
        <Divider sx={{ my: 1 }} />
        <CardContent sx={{ pt: 0 }}>
          {editMode ? (
            <Stack spacing={2}>
              <TextField
                label="First Name"
                name="firstName"
                value={formData.firstName || ""}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={formData.lastName || ""}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Specialty"
                name="specialty"
                value={formData.specialty || ""}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <WorkspacePremiumIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button variant="outlined" component="label" sx={{ alignSelf: "flex-start" }}>
                Upload New Photo
                <input hidden type="file" name="photo" accept="image/*" onChange={handleChange} />
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography>
                <strong>NIC Number:</strong> {profile.nicNumber || "-"}
              </Typography>
              <Typography>
                <strong>Gender:</strong> {profile.gender || "-"}
              </Typography>
              <Typography>
                <strong>Age:</strong> {profile.age || "-"}
              </Typography>
              <Typography>
                <strong>Address:</strong> {profile.address || "-"}
              </Typography>
              <Typography>
                <strong>Contact Number:</strong> {profile.contactNumber || "-"}
              </Typography>
              <Typography>
                <strong>Date of Birth:</strong> {profile.dateOfBirth?.substring(0, 10) || "-"}
              </Typography>
              <Typography>
                <strong>SLMC Registration #:</strong> {profile.slmcRegistrationNumber || "-"}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Patient card */}
      <Box sx={{ mt: 3 }}>
        <ViewPatientCard />
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={alert.severity} variant="filled" sx={{ width: "100%", borderRadius: 2 }}>
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Confirm Delete */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Delete</DialogTitle>
        <DialogContent sx={{ color: "text.secondary" }}>
          Are you sure you want to delete your profile? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>
          <Button color="error" onClick={handleDelete} sx={{ textTransform: "none", fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Availability / My Appointments */}
      <Dialog open={availOpen} onClose={() => setAvailOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Set Availability</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                type="date"
                label="Date"
                name="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={availabilityForm.date}
                onChange={handleAvailabilityChange}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                type="time"
                label="Start"
                name="startTime"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={availabilityForm.startTime}
                onChange={handleAvailabilityChange}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                type="time"
                label="End"
                name="endTime"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={availabilityForm.endTime}
                onChange={handleAvailabilityChange}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                type="number"
                label="Slot (minutes)"
                name="slotMinutes"
                fullWidth
                inputProps={{ min: 5, max: 120 }}
                value={availabilityForm.slotMinutes}
                onChange={handleAvailabilityChange}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                type="number"
                label="Patient limit"
                name="patientLimit"
                fullWidth
                inputProps={{ min: 1, max: 200 }}
                value={availabilityForm.patientLimit}
                onChange={handleAvailabilityChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Hospital"
                name="hospital"
                fullWidth
                value={availabilityForm.hospital}
                onChange={handleAvailabilityChange}
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
            Patients will see available times and a live booking count. Once the limit is
            reached, new bookings are blocked automatically.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAvailOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={saveAvailability}
            disabled={savingAvailability}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {savingAvailability ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

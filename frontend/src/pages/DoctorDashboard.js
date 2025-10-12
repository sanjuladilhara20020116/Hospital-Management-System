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
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import WcIcon from "@mui/icons-material/Wc";
import BadgeIcon from "@mui/icons-material/Badge";
import CakeIcon from "@mui/icons-material/Cake";
import HomeIcon from "@mui/icons-material/Home";

import ViewPatientCard from "../components/record/ViewPatientCard";
import "./DoctorDashboard.css"; // UI stylesheet

const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5000/api";
const UPLOADS_BASE =
  import.meta?.env?.VITE_UPLOADS_BASE_URL || "http://localhost:5000/uploads";

/** Small, purely-presentational info tile (keeps logic untouched) */
function InfoStat({ icon, label, value, md = 4 }) {
  return (
    <Grid item xs={12} sm={6} md={md}>
      <div className="dd-stat">
        <div className="dd-stat-icon">{icon}</div>
        <div className="dd-stat-content">
          <div className="dd-stat-label">{label}</div>
          <div className="dd-stat-value">{value}</div>
        </div>
      </div>
    </Grid>
  );
}

/**
 * Doctor Dashboard — all business logic preserved; UI modernized to match the reference.
 */
export default function DoctorDashboard({ userId: propUserId }) {
  const theme = useTheme();

  // ---- derived userId
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

  // ---- profile state
  const [profile, setProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // ---- alert/snackbar
  const [alert, setAlert] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const showAlert = (severity, message) =>
    setAlert({ open: true, severity, message });

  // ---- availability modal state
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

  // ---- appointments-by-date state
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // profile delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // delete appointments for selected date dialog
  const [deleteApptsOpen, setDeleteApptsOpen] = useState(false);
  const [deletingAppointments, setDeletingAppointments] = useState(false);

  // ---- effects: load profile
  useEffect(() => {
    let active = true;

    async function fetchProfile() {
      if (!userId) {
        showAlert("warning", "No userId available to load profile.");
        return;
      }
      try {
        const res = await axios.get(
          `${API_BASE}/users/${encodeURIComponent(userId)}`
        );
        if (!active) return;

        setProfile(res.data);
        setFormData(res.data);
        if (res.data?.photo) {
          setImagePreview(`${UPLOADS_BASE}/${res.data.photo}`);
        } else {
          setImagePreview(null);
        }
      } catch (err) {
        showAlert(
          "error",
          err?.response?.data?.message || "Failed to load profile"
        );
      }
    }

    fetchProfile();
    return () => {
      active = false;
    };
  }, [userId]);

  // ---- effects: load appointments when date/user changes
  useEffect(() => {
    async function loadAppointments() {
      if (!userId || !selectedDate) return;
      try {
        setLoadingAppointments(true);
        const params = new URLSearchParams({
          doctorId: userId,
          date: selectedDate,
        });
        const res = await axios.get(
          `${API_BASE}/appointments/getUserAppointments?${params.toString()}`
        );
        const arr = Array.isArray(res.data?.appointments)
          ? res.data.appointments
          : [];
        setAppointments(arr);
      } catch {
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    }
    loadAppointments();
  }, [userId, selectedDate]);

  // ---- profile edit handlers (logic unchanged)
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

      const res = await axios.get(
        `${API_BASE}/users/${encodeURIComponent(userId)}`
      );
      setProfile(res.data);
      setFormData(res.data);
      if (res.data?.photo) {
        setImagePreview(`${UPLOADS_BASE}/${res.data.photo}`);
      } else {
        setImagePreview(null);
      }
    } catch (err) {
      showAlert(
        "error",
        err?.response?.data?.message || "Failed to update profile"
      );
    }
  };

  const handleDelete = async () => {
    if (!userId || deleting) return;
    try {
      setDeleting(true);
      await axios.delete(`${API_BASE}/users/${encodeURIComponent(userId)}`);
      showAlert("success", "Profile deleted. Logging out...");
      setTimeout(() => {
        localStorage.removeItem("user");
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      showAlert(
        "error",
        err?.response?.data?.message || "Failed to delete profile"
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // ---- availability
  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      if (value && value < todayStr) {
        showAlert("error", "Please pick today or a future date for availability");
        return;
      }
    }
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
      const msg =
        err?.response?.data?.message || "Failed to save availability";
      showAlert("error", msg);
    } finally {
      setSavingAvailability(false);
    }
  };

  // Delete appointments service for a specific date
  const deleteAppointmentsForDate = async (date) => {
    if (!userId || !date) {
      showAlert("warning", "Doctor ID or date missing");
      return;
    }
    try {
      setDeletingAppointments(true);
      const params = new URLSearchParams({ date });
      const res = await axios.delete(
        `${API_BASE}/appointments/doctors/${encodeURIComponent(
          userId
        )}/delete-by-date?${params.toString()}`,
        { headers: { "X-Role": "Doctor", "X-User-Id": String(userId) } }
      );
      showAlert("success", res.data?.message || "Appointments deleted");
      setDeleteApptsOpen(false);
      setLoadingAppointments(true);
      const p = new URLSearchParams({ doctorId: userId, date });
      const r2 = await axios.get(
        `${API_BASE}/appointments/getUserAppointments?${p.toString()}`
      );
      setAppointments(
        Array.isArray(r2.data?.appointments) ? r2.data.appointments : []
      );
    } catch (err) {
      showAlert(
        "error",
        err?.response?.data?.message || "Failed to delete appointments"
      );
    } finally {
      setDeletingAppointments(false);
      setLoadingAppointments(false);
    }
  };

  if (!profile) {
    return (
      <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
        Loading...
      </Typography>
    );
  }

  return (
    <Box
      className="doctor-dashboard"
      sx={{ maxWidth: "100%", mx: "auto", mt: 3, px: 0, pb: 6 }}
    >
      {/* Main wrapper card provides small left/right margins */}
      <Card className="dd-main-card" elevation={0}>
        {/* Header / Hero */}
        <Box
          className="dd-hero"
          sx={{
            mb: 3,
            p: { xs: 2.5, sm: 3 },
            background: `#2563eb`,
            border: `1px solid ${theme.palette.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mx: 0,            // hero fills card width
            borderRadius: 0,  // rounding owned by main card
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={imagePreview || undefined}
              alt={`${profile.firstName || ""} ${profile.lastName || ""}`}
              sx={{
                width: 110,
                height: 110,
                border: `4px solid ${theme.palette.common.white}`,
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
            <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2, color: "#fff" }}>
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
                <Button variant="contained" onClick={handleSave} sx={{ textTransform: "none", fontWeight: 700 }}>
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

        {/* Profile Details / Stat Cards */}
        <Box sx={{ px: "var(--dd-gutter-x)" }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
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
                <Grid container spacing={2} className="dd-stats-grid">
                  <InfoStat icon={<EmailIcon />} label="Email" value={profile.email || "-"} />
                  <InfoStat icon={<BadgeIcon />} label="NIC Number" value={profile.nicNumber || "-"} />
                  <InfoStat icon={<WcIcon />} label="Gender" value={profile.gender || "-"} />
                  <InfoStat icon={<PersonOutlineIcon />} label="Age" value={profile.age || "-"} />
                  <InfoStat icon={<PhoneIphoneIcon />} label="Contact Number" value={profile.contactNumber || "-"} />
                  <InfoStat icon={<CakeIcon />} label="Date of Birth" value={profile.dateOfBirth?.substring(0, 10) || "-"} />
                  <InfoStat icon={<HomeIcon />} label="Address" value={profile.address || "-"} md={8} />
                  <InfoStat
                    icon={<WorkspacePremiumIcon />}
                    label="SLMC Registration #"
                    value={profile.slmcRegistrationNumber || "-"}
                  />
                </Grid>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Actions tiles */}
        {/* Actions tiles (hidden in edit mode) */}
{!editMode && (
  <Box className="dd-actions-wrap" sx={{ px: "var(--dd-gutter-x)" }}>
    <Typography variant="h6" className="dd-section-title">
      Actions
    </Typography>
    <div className="dd-actions-tiles">
      <Link to="/vaccinations/home" className="dd-tile dd-tile--green">
        <span className="dd-tile-icon"><VaccinesIcon /></span>
        <span className="dd-tile-text">Vaccination</span>
      </Link>

      <button className="dd-tile dd-tile--red" onClick={() => setAvailOpen(true)}>
        <span className="dd-tile-icon"><CalendarMonthIcon /></span>
        <span className="dd-tile-text">Book Appointment</span>
      </button>
    </div>
  </Box>
)}


        {/* Patient quick view */}
        {/* Patient quick view (hidden in edit mode) */}
{!editMode && (
  <Box sx={{ mt: 3, px: "var(--dd-gutter-x)" }}>
    <ViewPatientCard />
  </Box>
)}


        {/* Doctor Appointments by Date */}
        <Box sx={{ mt: 6, px: "var(--dd-gutter-x)" }}>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ mb: 2, color: "#05284cff", letterSpacing: 1, fontSize: 25 }}
          >
            Current Appointments
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3, gap: 2, alignItems: "center" }}>
            <TextField
              type="date"
              label="Select Date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: todayStr }}
              value={selectedDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val && val < todayStr) {
                  showAlert("error", "Please pick today or a future date");
                  return;
                }
                setSelectedDate(val);
              }}
              sx={{ minWidth: 260, background: "#f8fafc", borderRadius: 2 }}
            />
            <Button
              color="error"
              variant="outlined"
              onClick={() => setDeleteApptsOpen(true)}
              disabled={!selectedDate || appointments.length === 0}
              sx={{ textTransform: "none" }}
            >
              Delete Appointments for Date
            </Button>
          </Box>

          {loadingAppointments ? (
            <Typography color="info.main" sx={{ fontWeight: 600, letterSpacing: 1 }}>
              Loading appointments...
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, color: "#1976d2", fontWeight: 700, fontSize: 18 }}>
                Total Appointments: <span style={{ color: "#1976d2" }}>{appointments.length}</span>
              </Typography>

              {appointments.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontStyle: "italic", fontSize: 16 }}>
                  No appointments for this date.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {appointments.map((appt, idx) => (
                    <Card
                      key={appt._id || idx}
                      elevation={2}
                      sx={{
                        mb: 1,
                        borderLeft: "6px solid #1976d2",
                        background: "#f4f8fd",
                        borderRadius: 2,
                        p: 2,
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.07)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: "#1976d2",
                            color: "#fff",
                            width: 44,
                            height: 44,
                            fontWeight: 700,
                            fontSize: 22,
                          }}
                        >
                          {appt.patient?.name
                            ? appt.patient.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : "?"}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ color: "#000000ff", fontWeight: 700, mb: 0.5 }}>
                            {appt.patient?.name || "-"}
                          </Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: 15 }}>
                            <EmailIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} />{" "}
                            {appt.patient?.email || "-"}
                            {appt.patient?.phone && (
                              <span style={{ marginLeft: 12 }}>
                                <PhoneIphoneIcon sx={{ fontSize: 18, verticalAlign: "middle", mr: 0.5 }} />
                                {appt.patient.phone}
                              </span>
                            )}
                          </Typography>
                        </Box>
                        <Chip
                          label={appt.status || "-"}
                          color={
                            appt.status === "Booked"
                              ? "primary"
                              : appt.status === "Completed"
                              ? "success"
                              : appt.status === "Cancelled"
                              ? "error"
                              : "warning"
                          }
                          sx={{ fontWeight: 700, fontSize: 15, px: 1.5, py: 0.5, borderRadius: 1, textTransform: "capitalize" }}
                        />
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                        <Typography sx={{ color: "#000000ff", fontWeight: 600, fontSize: 16 }}>
                          🕒 {appt.time ? `${appt.time.start} - ${appt.time.end}` : appt.slotTime || "-"}
                        </Typography>
                        {appt.reason && (
                          <Typography sx={{ color: "text.secondary", fontStyle: "italic", fontSize: 15 }}>
                            📝 {appt.reason}
                          </Typography>
                        )}
                        <Typography sx={{ color: "text.disabled", fontSize: 14, ml: "auto" }}>
                          Ref: <span style={{ color: "#010101ff", fontWeight: 700 }}>{appt.referenceNo}</span>
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
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
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Confirm Delete</DialogTitle>
          <DialogContent sx={{ color: "text.secondary" }}>
            Are you sure you want to delete your profile? This action cannot be undone.
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: "none", fontWeight: 700 }}>
              Cancel
            </Button>
            <Button color="error" onClick={handleDelete} disabled={deleting} sx={{ textTransform: "none", fontWeight: 700 }}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Appointments for Selected Date */}
        <Dialog open={deleteApptsOpen} onClose={() => setDeleteApptsOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Delete Appointments</DialogTitle>
          <DialogContent sx={{ color: "text.secondary" }}>
            Are you sure you want to delete all appointments for <b>{selectedDate}</b>? This will remove{" "}
            <b>{appointments.length}</b> appointment(s) and cannot be undone.
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              sx={{ textTransform: "none", fontWeight: 700 }}
              onClick={() => setDeleteApptsOpen(false)}
              disabled={deletingAppointments}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              sx={{ textTransform: "none", fontWeight: 700 }}
              onClick={() => deleteAppointmentsForDate(selectedDate)}
              disabled={deletingAppointments}
            >
              {deletingAppointments ? "Deleting..." : "Delete"}
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
                  inputProps={{ min: todayStr }}
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
              Patients will see available times and a live booking count. Once the limit is reached, new bookings are
              blocked automatically.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAvailOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>
              Close
            </Button>
            <Button variant="contained" onClick={saveAvailability} disabled={savingAvailability} sx={{ textTransform: "none", fontWeight: 700 }}>
              {savingAvailability ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
}

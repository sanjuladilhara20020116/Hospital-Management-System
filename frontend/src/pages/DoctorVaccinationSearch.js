// src/pages/DoctorVaccinationSearch.js
import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

// MUI
import {
  Container,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
  Stack,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Box,
  CircularProgress,
  InputAdornment,
  Avatar,
  Fade,
  Skeleton,
  Tooltip,
  IconButton,
  Snackbar,
  Slide,
  Zoom,
  useTheme,
  alpha,
  Backdrop,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WarningIcon from "@mui/icons-material/Warning";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// -------- Palette (from your strip) --------
const BLUE = {
  main: "#2C69F0",
  mid: "#4D8DF7",
  light: "#C7D9FE",
};
const GREEN = {
  start: "#34D399",
  end: "#10B981",
};

// -------- Validation & Sanitization --------
const validateInput = (value, type) => {
  if (!value || typeof value !== "string") return false;
  const sanitized = value.trim();
  if (!sanitized) return false;

  if (type === "id") {
    return /^P\d{4}\/\d{1,4}\/\d{1,4}$/.test(sanitized);
  } else if (type === "nic") {
    return /^\d{9}[vVxX]$|^\d{12}$/.test(sanitized);
  }
  return false;
};

const sanitizeInput = (input) => {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>"'&]/g, "");
};

// -------- Clipboard hook --------
const useClipboard = () => {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return true;
      } catch {}
      console.error("Failed to copy to clipboard:", err);
      return false;
    }
  }, []);
  return { copyToClipboard, copied };
};

// -------- Animated Card --------
const AnimatedCard = ({ children, delay = 0, ...props }) => {
  const [show, setShow] = useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <Slide direction="up" in={show} timeout={{ enter: 800 }}>
      <Card {...props}>{children}</Card>
    </Slide>
  );
};

// -------- Gradient Button (now forces white label + icon) --------
const GradientButton = ({ children, variant = "primary", ...props }) => {
  const theme = useTheme();
  const gradients = {
    primary: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
    secondary: `linear-gradient(135deg, ${BLUE.mid} 0%, ${BLUE.light} 100%)`,
    success: `linear-gradient(135deg, ${GREEN.start} 0%, ${GREEN.end} 100%)`,
  };

  return (
    <Button
      {...props}
      sx={{
        background: gradients[variant],
        borderRadius: 4,
        textTransform: "none",
        fontWeight: 700,
        color: "#fff",                                // <-- white text
        "& .MuiSvgIcon-root": { color: "#fff" },     // <-- white icon
        "&:disabled": { color: "rgba(255,255,255,0.7)" },
        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
          transition: "left 0.5s",
        },
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.5)}`,
          "&::before": { left: "100%" },
        },
        "&:active": { transform: "translateY(0px)" },
        ...props.sx,
      }}
    >
      {children}
    </Button>
  );
};

// -------- Glow TextField --------
const GlowTextField = (props) => {
  const theme = useTheme();
  return (
    <TextField
      {...props}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 4,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": { boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.25)}` },
          "&.Mui-focused": {
            boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.35)}`,
            borderColor: theme.palette.primary.main,
          },
        },
        "& .MuiInputLabel-root": { fontWeight: 600, color: theme.palette.text.primary },
        ...props.sx,
      }}
    />
  );
};

export default function DoctorVaccinationSearch() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { copyToClipboard, copied } = useClipboard();

  // State
  const [mode, setMode] = useState("id");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Validation
  const isValidInput = useMemo(() => validateInput(query, mode), [query, mode]);

  // Search
  const handleSearch = useCallback(
    async (e) => {
      e.preventDefault();
      const sanitized = sanitizeInput(query);
      const normalized = mode === "nic" ? sanitized.toUpperCase() : sanitized;

      if (!validateInput(normalized, mode)) {
        setError(
          `Please enter a valid ${
            mode === "id"
              ? "Patient ID (e.g., P2025/898/16)"
              : "NIC (9 digits + V/X or 12 digits)"
          }.`
        );
        return;
      }

      setError("");
      setPatient(null);
      setLoading(true);

      try {
        const params = mode === "id" ? { userId: normalized } : { nic: normalized };
        const { data } = await API.get("/api/user-lookup", {
          params,
          timeout: 10000,
        });

        if (!data || typeof data !== "object") throw new Error("Invalid response from server");

        setPatient(data);
        setShowSuccess(true);
      } catch (err) {
        console.error("Search error:", err);
        const msg =
          err?.response?.status === 404
            ? "Patient not found. Please verify the information and try again."
            : err?.response?.data?.message ||
              err?.message ||
              "Search failed. Please check your connection and try again.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [query, mode]
  );

  // Navigate
  const handleCreateVaccination = useCallback(() => {
    if (!patient?.userId) {
      setError("Patient information is not available.");
      return;
    }
    try {
      const encodedUserId = encodeURIComponent(patient.userId);
      navigate(`/vaccinations/new?patientUserId=${encodedUserId}`);
    } catch (err) {
      console.error("Navigation error:", err);
      setError("Unable to navigate to vaccination form.");
    }
  }, [patient, navigate]);

  // Mode change
  const handleModeChange = useCallback(
    (_, newMode) => {
      if (newMode && newMode !== mode) {
        setMode(newMode);
        setQuery("");
        setError("");
        setPatient(null);
      }
    },
    [mode]
  );

  // Clear
  const handleClear = useCallback(() => {
    setPatient(null);
    setQuery("");
    setError("");
  }, []);

  // Safe date format
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  return (
    <>
      {/* Background */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          },
          zIndex: -2,
        }}
      />

      <Container maxWidth="lg" sx={{ py: 6, position: "relative", zIndex: 1 }}>
        {/* Header */}
        <Zoom in timeout={1000}>
          <Paper
            elevation={20}
            sx={{
              p: 4,
              mb: 6,
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
                  boxShadow: `0 15px 35px ${alpha(BLUE.main, 0.4)}`,
                  position: "relative",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: -2,
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${BLUE.main}, ${BLUE.mid})`,
                    zIndex: -1,
                    animation: "pulse 2s infinite",
                  },
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.7 },
                  },
                }}
              >
                <HealthAndSafetyIcon sx={{ color: "#fff", fontSize: 40 }} />
              </Box>
              <Box sx={{ textAlign: "left" }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                  }}
                >
                  Vaccination Hub
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Advanced Patient Search & Certificate Management
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Zoom>

        {/* Search Panel */}
        <AnimatedCard
          elevation={24}
          delay={300}
          sx={{
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            mb: 4,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              height: 6,
              background: `linear-gradient(90deg, ${BLUE.main} 0%, ${BLUE.mid} 50%, ${BLUE.light} 100%)`,
            }}
          />
          <CardContent sx={{ p: 5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 4,
                textAlign: "center",
                background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Patient Discovery Portal
            </Typography>

            <Paper
              component="form"
              onSubmit={handleSearch}
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Stack spacing={4}>
                <ToggleButtonGroup
                  color="primary"
                  value={mode}
                  exclusive
                  onChange={handleModeChange}
                  size="large"
                  sx={{
                    alignSelf: "center",
                    background: "rgba(255, 255, 255, 0.8)",
                    borderRadius: 4,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    "& .MuiToggleButton-root": {
                      px: 4,
                      py: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      border: "none",
                      borderRadius: "16px !important",
                      margin: 1,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&.Mui-selected": {
                        color: "#fff",
                        background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
                        boxShadow: `0 8px 25px ${alpha(BLUE.main, 0.4)}`,
                        transform: "scale(1.05)",
                      },
                      "&:hover": { background: alpha(theme.palette.primary.main, 0.1) },
                    },
                  }}
                >
                  <ToggleButton value="id">
                    <BadgeIcon sx={{ fontSize: 24, mr: 2 }} />
                    Patient ID Search
                  </ToggleButton>
                  <ToggleButton value="nic">
                    <PersonIcon sx={{ fontSize: 24, mr: 2 }} />
                    NIC Verification
                  </ToggleButton>
                </ToggleButtonGroup>

                <GlowTextField
                  fullWidth
                  size="medium"
                  label={mode === "id" ? "Enter Patient ID" : "Enter NIC Number"}
                  placeholder={
                    mode === "id" ? "e.g., P2025/898/16" : "e.g., 200123456V or 200429013230"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  error={!isValidInput && !!query}
                  helperText={
                    mode === "id"
                      ? "Format: P[YEAR]/[NUMBER]/[NUMBER]"
                      : "Enter 9 digits + V/X (e.g., 200123456V) or a 12-digit NIC"
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "primary.main", fontSize: 28 }} />
                      </InputAdornment>
                    ),
                    sx: { fontSize: "1.2rem", py: 1 },
                  }}
                />

                {/* White label + icon via GradientButton defaults */}
                <GradientButton
                  type="submit"
                  variant="primary"
                  size="large"
                  startIcon={
                    loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />
                  }
                  disabled={loading || !isValidInput}
                  sx={{ py: 2, px: 6, fontSize: "1.2rem", alignSelf: "center", minWidth: 250 }}
                >
                  {loading ? "Searching..." : "Search Patient"}
                </GradientButton>
              </Stack>

              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    onClose={() => setError("")}
                    icon={<WarningIcon fontSize="large" />}
                    sx={{
                      mt: 3,
                      borderRadius: 3,
                      background: "rgba(244, 67, 54, 0.1)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(244, 67, 54, 0.2)",
                    }}
                  >
                    <Typography variant="body1" fontWeight={600}>
                      {error}
                    </Typography>
                  </Alert>
                </Fade>
              )}
            </Paper>
          </CardContent>
        </AnimatedCard>

        {/* Loading Skeleton */}
        {loading && !patient && (
          <AnimatedCard
            elevation={24}
            delay={0}
            sx={{
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              overflow: "hidden",
              maxWidth: 1000,
              mx: "auto",
            }}
          >
            <Box
              sx={{
                height: 6,
                background: `linear-gradient(90deg, ${BLUE.main} 0%, ${BLUE.mid} 50%, ${BLUE.light} 100%)`,
              }}
            />
            <CardContent sx={{ p: 5 }}>
              <Stack spacing={4}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Skeleton variant="circular" width={80} height={80} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={50} />
                    <Skeleton variant="text" width="40%" height={30} />
                  </Box>
                </Box>
                <Divider />
                <Grid container spacing={4}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Skeleton variant="text" width="100%" height={30} />
                      <Skeleton variant="text" width="80%" height={40} />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Result Card */}
        {patient && !loading && (
          <AnimatedCard
            elevation={24}
            delay={500}
            sx={{
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              overflow: "hidden",
              maxWidth: 1000,
              mx: "auto",
              position: "relative",
            }}
          >
            <Box
              sx={{
                height: 8,
                background: `linear-gradient(90deg, ${BLUE.main} 0%, ${BLUE.mid} 50%, ${BLUE.light} 100%)`,
              }}
            />
            <CardContent sx={{ p: 5 }}>
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: 3,
                  mb: 4,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Avatar
                    sx={{
                      background: `linear-gradient(135deg, ${BLUE.main} 0%, ${BLUE.mid} 100%)`,
                      width: 80,
                      height: 80,
                      fontWeight: 700,
                      fontSize: "2rem",
                      boxShadow: `0 8px 32px ${alpha(BLUE.main, 0.4)}`,
                      border: "3px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    {(patient.firstName?.[0] || "P").toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                      {[patient.firstName, patient.lastName].filter(Boolean).join(" ") ||
                        "Unnamed Patient"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography
                        variant="h6"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}
                      >
                        <BadgeIcon sx={{ fontSize: 24, mr: 1.5, color: "primary.main" }} />
                        {patient.userId}
                      </Typography>
                      <Tooltip title="Copy Patient ID">
                        <IconButton
                          aria-label="Copy Patient ID"
                          size="medium"
                          onClick={() => copyToClipboard(patient.userId)}
                          sx={{
                            background: alpha(theme.palette.primary.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            "&:hover": {
                              background: alpha(theme.palette.primary.main, 0.2),
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 20, color: "primary.main" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>

                {/* Green "Verified Patient" */}
                <Chip
                  icon={<VerifiedUserIcon />}
                  label="Verified Patient"
                  size="large"
                  sx={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    py: 2,
                    px: 3,
                    background: `linear-gradient(135deg, ${GREEN.start} 0%, ${GREEN.end} 100%)`,
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 8px 25px rgba(16, 185, 129, 0.35)",
                  }}
                />
              </Box>

              <Divider sx={{ my: 4, borderWidth: 1 }} />

              {/* Details */}
              <Grid container spacing={4}>
                {[
                  { icon: <BadgeIcon />, label: "NIC", value: patient.nicNumber || "Not provided" },
                  { icon: <PersonIcon />, label: "Gender", value: patient.gender || "Not specified" },
                  {
                    icon: <CalendarTodayIcon />,
                    label: "Age",
                    value: Number.isFinite(Number(patient.age)) ? `${patient.age} years` : "Not specified",
                  },
                  { icon: <CalendarTodayIcon />, label: "Date of Birth", value: formatDate(patient.dateOfBirth) },
                  { icon: <EmailIcon />, label: "Email", value: patient.email || "Not provided" },
                  { icon: <PhoneIcon />, label: "Phone", value: patient.contactNumber || "Not provided" },
                ].map((item, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        transition: "all 0.3s",
                        "&:hover": {
                          transform: "translateY(-5px)",
                          boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: alpha(theme.palette.primary.main, 0.1),
                            mr: 2,
                          }}
                        >
                          {React.cloneElement(item.icon, { sx: { fontSize: 20, color: "primary.main" } })}
                        </Box>
                        <Typography variant="body1" fontWeight={700} color="text.secondary">
                          {item.label}
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      transition: "all 0.3s",
                      "&:hover": { transform: "translateY(-5px)", boxShadow: "0 15px 35px rgba(0,0,0,0.1)" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: alpha(theme.palette.primary.main, 0.1),
                          mr: 2,
                        }}
                      >
                        <LocationOnIcon sx={{ fontSize: 20, color: "primary.main" }} />
                      </Box>
                      <Typography variant="body1" fontWeight={700} color="text.secondary">
                        Address
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {patient.address || "Not provided"}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      transition: "all 0.3s",
                      "&:hover": { transform: "translateY(-5px)", boxShadow: "0 15px 35px rgba(0,0,0,0.1)" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: alpha("#f57c00", 0.1),
                          mr: 2,
                        }}
                      >
                        <WarningIcon sx={{ fontSize: 20, color: "#f57c00" }} />
                      </Box>
                      <Typography variant="body1" fontWeight={700} color="text.secondary">
                        Allergies
                      </Typography>
                    </Box>
                    {patient.allergies?.length ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                        {patient.allergies.map((a, i) => (
                          <Chip
                            key={i}
                            label={a}
                            size="medium"
                            sx={{
                              fontWeight: 700,
                              background: "linear-gradient(135deg, #FFEAA7 0%, #FDCB6E 100%)",
                              color: "#2d3436",
                              fontSize: "1rem",
                              py: 2,
                              px: 1,
                              boxShadow: "0 4px 15px rgba(253, 203, 110, 0.3)",
                              border: "none",
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ fontSize: "1.1rem", fontStyle: "italic" }}
                      >
                        No known allergies
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      transition: "all 0.3s",
                      "&:hover": { transform: "translateY(-5px)", boxShadow: "0 15px 35px rgba(0,0,0,0.1)" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: alpha("#00b894", 0.1),
                          mr: 2,
                        }}
                      >
                        <MedicalInformationIcon sx={{ fontSize: 20, color: "#00b894" }} />
                      </Box>
                      <Typography variant="body1" fontWeight={700} color="text.secondary">
                        Medical History
                      </Typography>
                    </Box>
                    {patient.medicalHistory?.length ? (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                        {patient.medicalHistory.map((m, i) => (
                          <Chip
                            key={i}
                            label={m}
                            size="medium"
                            sx={{
                              fontWeight: 700,
                              background: "linear-gradient(135deg, #81ECEC 0%, #00B894 100%)",
                              color: "#fff",
                              fontSize: "1rem",
                              py: 2,
                              px: 1,
                              boxShadow: "0 4px 15px rgba(0, 184, 148, 0.3)",
                              border: "none",
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ fontSize: "1.1rem", fontStyle: "italic" }}
                      >
                        No significant medical history
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Actions */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 3,
                  mt: 6,
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: "center",
                }}
              >
                <GradientButton
                  variant="primary"
                  size="large"
                  startIcon={<VaccinesIcon />}
                  onClick={handleCreateVaccination}
                  sx={{ py: 2.5, px: 6, fontSize: "1.3rem", minWidth: 350 }}
                >
                  Create Vaccination
                </GradientButton>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  sx={{
                    py: 2.5,
                    px: 6,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: alpha(theme.palette.text.secondary, 0.3),
                    color: "text.secondary",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.3s",
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                      borderColor: "text.secondary",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  Clear Search
                </Button>
              </Box>
            </CardContent>
          </AnimatedCard>
        )}

        {/* Notifications */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          TransitionComponent={Slide}
        >
          <Alert
            severity="success"
            onClose={() => setShowSuccess(false)}
            icon={<CheckCircleIcon />}
            sx={{
              borderRadius: 4,
              background: `linear-gradient(135deg, ${GREEN.start} 0%, ${GREEN.end} 100%)`,
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 10px 30px rgba(16, 185, 129, 0.4)",
              "& .MuiAlert-icon": { color: "#fff", fontSize: 28 },
            }}
          >
            ✨ Patient record found successfully!
          </Alert>
        </Snackbar>

        <Snackbar
          open={copied}
          autoHideDuration={2500}
          onClose={() => {}}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          TransitionComponent={Zoom}
        >
          <Alert
            severity="info"
            icon={<ContentCopyIcon />}
            sx={{
              borderRadius: 4,
              fontWeight: 700,
              fontSize: "1rem",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            📋 Copied to clipboard!
          </Alert>
        </Snackbar>

        {/* Loading Backdrop */}
        <Backdrop
          sx={{
            color: "#fff",
            zIndex: (t) => t.zIndex.drawer + 1,
            background: "rgba(44, 105, 240, 0.1)",
            backdropFilter: "blur(20px)",
          }}
          open={loading}
        >
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress
              size={60}
              thickness={4}
              sx={{
                color: "#fff",
                mb: 3,
                "& .MuiCircularProgress-circle": { strokeLinecap: "round" },
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#fff" }}>
              Searching for patient...
            </Typography>
            <Typography variant="body2" sx={{ color: alpha("#fff", 0.8), mt: 1 }}>
              Please wait while we locate the record
            </Typography>
          </Box>
        </Backdrop>
      </Container>
    </>
  );
}

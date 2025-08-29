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

// Validation utilities
const validateInput = (value, type) => {
  if (!value || typeof value !== 'string') return false;
  
  const sanitized = value.trim();
  if (!sanitized) return false;

  if (type === 'id') {
    // Patient ID format validation (example: P2025/898/16)
    return /^P\d{4}\/\d{1,4}\/\d{1,4}$/.test(sanitized);
  } else if (type === 'nic') {
    // NIC format validation (Sri Lankan format)
    return /^\d{9}[vVxX]$|^\d{12}$/.test(sanitized);
  }
  
  return false;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>\"'&]/g, '');
};

// Custom hook for clipboard functionality
const useClipboard = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, []);

  return { copyToClipboard, copied };
};

export default function DoctorVaccinationSearch() {
  const navigate = useNavigate();
  const { copyToClipboard, copied } = useClipboard();

  // State management
  const [mode, setMode] = useState("id");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Memoized validation
  const isValidInput = useMemo(() => {
    return validateInput(query, mode);
  }, [query, mode]);

  // Safe search handler
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    
    const sanitizedQuery = sanitizeInput(query);
    
    if (!validateInput(sanitizedQuery, mode)) {
      setError(`Please enter a valid ${mode === 'id' ? 'Patient ID (e.g., P2025/898/16)' : 'NIC number'}.`);
      return;
    }

    setError("");
    setPatient(null);
    setLoading(true);

    try {
      const params = mode === "id" 
        ? { userId: sanitizedQuery } 
        : { nic: sanitizedQuery };

      const { data } = await API.get("/api/user-lookup", {
        params,
        timeout: 10000, // 10 second timeout
      });

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from server');
      }

      setPatient(data);
      setShowSuccess(true);
    } catch (err) {
      console.error('Search error:', err);
      
      const errorMessage = err?.response?.status === 404 
        ? "Patient not found. Please verify the information and try again."
        : err?.response?.data?.message 
        || err?.message 
        || "Search failed. Please check your connection and try again.";
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [query, mode]);

  // Safe navigation handler
  const handleCreateVaccination = useCallback(() => {
    if (!patient?.userId) {
      setError("Patient information is not available.");
      return;
    }

    try {
      const encodedUserId = encodeURIComponent(patient.userId);
      navigate(`/vaccinations/new?patientUserId=${encodedUserId}`);
    } catch (err) {
      console.error('Navigation error:', err);
      setError("Unable to navigate to vaccination form.");
    }
  }, [patient?.userId, navigate]);

  // Mode change handler
  const handleModeChange = useCallback((_, newMode) => {
    if (newMode && newMode !== mode) {
      setMode(newMode);
      setQuery("");
      setError("");
      setPatient(null);
    }
  }, [mode]);

  // Clear handler
  const handleClear = useCallback(() => {
    setPatient(null);
    setQuery("");
    setError("");
  }, []);

  // Format date safely
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Not specified";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center"
        }}
      >
        <Box
          sx={{
            width: 70,
            height: 70,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 50%, #6A11CB 100%)",
            boxShadow: "0 8px 32px rgba(106, 17, 203, 0.3)",
            mb: 2
          }}
        >
          <HealthAndSafetyIcon sx={{ color: "#fff", fontSize: 36 }} />
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5, color: '#2a4c7d' }}>
          Vaccination Management
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, fontWeight: 400 }}>
          Search for patient records to create vaccination certificates
        </Typography>
      </Box>

      {/* Search panel */}
      <Paper
        component="form"
        onSubmit={handleSearch}
        elevation={4}
        sx={{
          p: { xs: 3, sm: 4 },
          mb: 4,
          borderRadius: 4,
          background: "linear-gradient(to bottom, #ffffff, #f8faff)",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 36px rgba(47, 111, 237, 0.12)",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#2a4c7d', textAlign: 'center' }}>
          Find Patient Record
        </Typography>
        
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems={{ md: "flex-end" }}
          justifyContent="center"
        >
          <ToggleButtonGroup
            color="primary"
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="medium"
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              "& .MuiToggleButton-root": {
                px: 3,
                py: 1.2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: '1rem',
                border: "1px solid",
                borderColor: "divider",
                "&.Mui-selected": {
                  color: "#fff",
                  background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 100%)",
                  borderColor: "transparent",
                },
              },
            }}
          >
            <ToggleButton value="id">
              <BadgeIcon sx={{ fontSize: 20, mr: 1.5 }} />
              By Patient ID
            </ToggleButton>
            <ToggleButton value="nic">
              <PersonIcon sx={{ fontSize: 20, mr: 1.5 }} />
              By NIC
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth
            label={mode === "id" ? "Patient ID" : "NIC Number"}
            placeholder={mode === "id" ? "e.g., P2025/898/16" : "e.g., 200429013230"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            error={!!error && !loading}
            helperText={
              mode === "id" 
                ? "Format: P[YEAR]/[NUMBER]/[NUMBER]" 
                : "Enter 10-digit NIC (with V) or 12-digit NIC"
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "primary.main" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                background: '#fff',
                fontSize: '1rem',
              },
              "& .MuiInputLabel-root": {
                fontWeight: 500
              }
            }}
          />

          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            disabled={loading || !isValidInput}
            sx={{
              px: 4,
              py: 1.8,
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 3,
              boxShadow: "0 8px 20px rgba(47,111,237,.35)",
              background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 100%)",
              "&:hover": {
                boxShadow: "0 12px 24px rgba(47,111,237,.45)",
                background: "linear-gradient(135deg, #2D65DB 0%, #258AC9 100%)",
              },
              "&:disabled": {
                boxShadow: "none",
              },
            }}
          >
            {loading ? "Searching..." : "Search Patient"}
          </Button>
        </Stack>
        
        {error && (
          <Fade in={true}>
            <Alert 
              severity="error" 
              onClose={() => setError("")}
              sx={{ 
                mt: 3, 
                borderRadius: 2,
                alignItems: 'center',
                '& .MuiAlert-message': {
                  padding: '8px 0'
                }
              }}
              icon={<WarningIcon fontSize="large" />}
            >
              <Typography variant="body1" fontWeight={500}>
                {error}
              </Typography>
            </Alert>
          </Fade>
        )}
      </Paper>

      {/* Loading Skeleton */}
      {loading && !patient && (
        <Card
          elevation={8}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 16px 40px rgba(47,111,237,.15)",
            maxWidth: 1000,
            mx: 'auto'
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Skeleton variant="circular" width={60} height={60} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={40} />
                  <Skeleton variant="text" width="40%" height={24} />
                </Box>
              </Box>
              <Divider />
              <Grid container spacing={3}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Skeleton variant="text" width="100%" height={24} />
                    <Skeleton variant="text" width="80%" height={32} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Result card */}
      {patient && !loading && (
        <Fade in={true}>
          <Card
            elevation={8}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 16px 40px rgba(47,111,237,.15)",
              maxWidth: 1000,
              mx: 'auto'
            }}
          >
            {/* Top banner */}
            <Box
              sx={{
                height: 10,
                background: "linear-gradient(90deg, #2F6FED, #2D9BDB, #6A11CB)",
              }}
            />
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 100%)",
                      width: 60,
                      height: 60,
                      fontWeight: 700,
                      fontSize: '1.5rem',
                      boxShadow: '0 4px 12px rgba(47,111,237,.4)'
                    }}
                  >
                    {(patient.firstName?.[0] || "P").toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {patient.firstName} {patient.lastName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                        <BadgeIcon sx={{ fontSize: 20, mr: 1 }} /> {patient.userId}
                      </Typography>
                      <Tooltip title="Copy Patient ID">
                        <IconButton 
                          size="small"
                          onClick={() => copyToClipboard(patient.userId)}
                          sx={{ 
                            background: "rgba(47,111,237,.1)",
                            '&:hover': {
                              background: "rgba(47,111,237,.2)",
                            }
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
                <Chip
                  icon={<VerifiedUserIcon />}
                  label="Verified Patient"
                  size="medium"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    py: 1.5,
                    bgcolor: "rgba(47,111,237,.1)",
                    color: "primary.dark",
                  }}
                />
              </Box>

              <Divider sx={{ my: 3.5, borderWidth: 1 }} />

              <Grid container spacing={4}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <BadgeIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">NIC:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.nicNumber || "Not provided"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Gender:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.gender || "Not specified"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Age:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.age ? `${patient.age} years` : "Not specified"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Date of Birth:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {formatDate(patient.dateOfBirth)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Email:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.email || "Not provided"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Phone:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.contactNumber || "Not provided"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Address:</Typography>
                  </Box>
                  <Typography variant="body1" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                    {patient.address || "Not provided"}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <WarningIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Allergies:</Typography>
                  </Box>
                  {patient.allergies?.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, pl: 4.5 }}>
                      {patient.allergies.map((a, i) => (
                        <Chip
                          key={i}
                          label={a}
                          size="medium"
                          sx={{
                            fontWeight: 600,
                            bgcolor: "rgba(247, 201, 72, .2)",
                            color: "#8a6500",
                            fontSize: '0.95rem',
                            py: 1.5
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                      No known allergies
                    </Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <MedicalInformationIcon sx={{ fontSize: 22, mr: 1.5, color: 'primary.main' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">Medical History:</Typography>
                  </Box>
                  {patient.medicalHistory?.length ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, pl: 4.5 }}>
                      {patient.medicalHistory.map((m, i) => (
                        <Chip
                          key={i}
                          label={m}
                          size="medium"
                          sx={{
                            fontWeight: 600,
                            bgcolor: "rgba(50,181,166,.2)",
                            color: "#006b5f",
                            fontSize: '0.95rem',
                            py: 1.5
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary" sx={{ pl: 4.5, fontSize: '1.1rem' }}>
                      No significant medical history
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={3}
                sx={{ mt: 5 }}
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  startIcon={<VaccinesIcon />}
                  onClick={handleCreateVaccination}
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    borderRadius: 3,
                    px: 4,
                    py: 1.8,
                    flex: { xs: 'none', sm: 1 },
                    maxWidth: 400,
                    background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 100%)",
                    boxShadow: "0 8px 20px rgba(47,111,237,.35)",
                    "&:hover": {
                      boxShadow: "0 12px 24px rgba(47,111,237,.45)",
                      background: "linear-gradient(135deg, #2D65DB 0%, #258AC9 100%)",
                    },
                  }}
                >
                  Create Vaccination Certificate
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: 3,
                    px: 4,
                    py: 1.8,
                    flex: { xs: 'none', sm: 0.4 },
                    color: "text.secondary",
                    borderColor: "divider",
                    "&:hover": {
                      backgroundColor: "action.hover",
                      borderColor: "text.secondary",
                    },
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Success Notification */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={() => setShowSuccess(false)}
          sx={{ 
            borderRadius: 3,
            background: "linear-gradient(135deg, #2F6FED 0%, #2D9BDB 100%)",
            color: '#fff',
            fontWeight: 600,
            '& .MuiAlert-icon': {
              color: '#fff',
            }
          }}
        >
          Patient record found successfully!
        </Alert>
      </Snackbar>

      {/* Clipboard Notification */}
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="info"
          sx={{ 
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </Container>
  );
}
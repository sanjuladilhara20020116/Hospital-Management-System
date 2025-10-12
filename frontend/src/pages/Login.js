import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Snackbar,
  Alert,
  Link as MUILink,
  IconButton,
} from "@mui/material";
  import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      showAlert("success", "✅ Login successful!");
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "❌ Invalid email or password"
      );
    }
  };

  return (
    // Full-viewport shell that ignores parent paddings/containers
    <Box sx={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Grid container sx={{ height: "100%", width: "100%" }}>
        {/* LEFT: Brand panel */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
            background: "#2F6FE5",
            color: "#fff",
            p: { md: 8 },
            flex: "1 1 50%",
          }}
        >
          <Box sx={{ textAlign: "center", maxWidth: 520 }}>
            <Box
              sx={{
                width: 260,
                height: 260,
                mx: "auto",
                mb: 4,
                borderRadius: "50%",
                bgcolor: "#fff",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {/* Replace with your logo path or import */}
              <Box
                component="img"
                src="./medicore.png"
                alt="MediCore logo"
                sx={{ width: 180, height: "auto" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 0.3, mb: 2 }}>
              MediCore
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.5, mx: "auto", maxWidth: 520 }}>
              “Welcome to MediCore—your secure OPD workspace. Sign in to orchestrate appointments, queues,
              e-prescriptions, labs, and billing from a single interface. With role-based access, audit trails,
              and FHIR-ready integrations, MediCore streamlines workflows and accelerates patient-centric care.”
            </Typography>
          </Box>
        </Grid>

        {/* RIGHT: Form panel */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#F9FAFB",
            p: { xs: 3, md: 8 },
            flex: "1 1 50%",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 520 }}>
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{ color: "text.secondary", mb: 2 }}
            >
              <ArrowBackIosNew fontSize="small" />
              <Typography sx={{ ml: 1, fontSize: 14 }}>Back</Typography>
            </IconButton>

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Account Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              If you are already a member you can login with your email address and password.
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                bgcolor: "#fff",
                borderRadius: 3,
                p: 3,
                boxShadow:
                  "0px 10px 15px -3px rgba(0,0,0,0.07), 0px 4px 6px -2px rgba(0,0,0,0.05)",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Email address
              </Typography>
              <TextField
                fullWidth
                placeholder="sampleuser@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="dense"
                required
                sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                placeholder="*************"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="dense"
                required
                sx={{ mb: 3, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />

              <Button variant="contained" type="submit" fullWidth sx={{ py: 1.4, borderRadius: 2 }}>
                SIGN IN
              </Button>

              <Typography variant="body2" align="center" sx={{ mt: 2, color: "text.secondary" }}>
                Don’t have an account?{" "}
                <MUILink component={RouterLink} to="/register" underline="hover">
                  Sign up here
                </MUILink>
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert severity={alert.severity} variant="filled" sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

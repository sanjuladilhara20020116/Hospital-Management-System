// src/components/lab/LabJobForm.jsx
import React, { useState } from "react";
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
} from "@mui/material";
import PersonOutline from "@mui/icons-material/PersonOutline";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import AddRounded from "@mui/icons-material/AddRounded";

const TEST_TYPES = [
  "Cholesterol",
  "Diabetes",
  "X-ray",
  "Full Blood Count",
  "Liver Function",
  "Kidney Function",
  "Other",
];

const TIME_SLOTS = ['Morning','Afternoon','Evening','Night'];

export default function LabJobForm({ onSubmit }) {
  const [values, setValues] = useState({
    patientName: "",
    patientId: "",
    testType: "",
            // will hold "YYYY-MM-DDTHH:mm"
   timeSlot: "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!values.patientName.trim()) e.patientName = "Required";
    if (!values.patientId.trim()) e.patientId = "Required";
    if (!values.testType) e.testType = "Required";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
  ev.preventDefault();
  if (!validate()) return;
  const { patientName, patientId, testType, timeSlot } = values;
  onSubmit({ patientName, patientId, testType, timeSlot }); // ✅ no scheduledDate
};

  // shared input style to match the reference UI
  const inputSx = {
    minWidth: { xs: "100%", sm: 260 },
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      bgcolor: "white",
      boxShadow: "0 2px 6px rgba(2,32,71,0.06)",
      "& fieldset": { borderColor: "#dbe3ef" },
      "&:hover fieldset": { borderColor: "#9db7e0" },
      "&.Mui-focused fieldset": { borderColor: "#1366D6", borderWidth: 2 },
    },
  };

 return (
  <Box
    component="form"
    onSubmit={submit}
    sx={{
      p: 2,
      borderTop: "1px solid #e8eef7",
      display: "block",
    }}
  >
    {/* Title */}
    <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
      <Box
        sx={{
          fontSize: { xs: 22, md: 25 },
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          color: "#4b4a4a",
          mt: 3,
          mb: 2,
        }}
      >
        Create New Lab Job
      </Box>
      <Box sx={{ height: 1, bgcolor: "#e8eef7" }} />
    </Box>

    {/* Responsive grid form */}
    <Box
      sx={{
        display: "grid",
        gap: 2,
        alignItems: "end",
        gridTemplateColumns: {
          xs: "1fr",                // phones
          md: "repeat(2, 1fr)",     // tablets
          lg: "repeat(4, 1fr)",     // desktops
        },
      }}
    >
      {/* Patient Name */}
      <Box sx={{ width: "100%" }}>
        <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
          Patient Name
        </Box>
        <TextField
          fullWidth
          placeholder="Enter patient full name"
          name="patientName"
          value={values.patientName}
          onChange={handleChange}
          error={!!errors.patientName}
          helperText={errors.patientName}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutline fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        />
      </Box>

      {/* Patient ID */}
      <Box sx={{ width: "100%" }}>
        <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
          Patient ID (e.g., P2025/123/1)
        </Box>
        <TextField
          fullWidth
          placeholder="P2025/123/1"
          name="patientId"
          value={values.patientId}
          onChange={handleChange}
          error={!!errors.patientId}
          helperText={errors.patientId}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BadgeOutlined fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        />
      </Box>

      {/* Test Type */}
      <Box sx={{ width: "100%" }}>
        <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
          Test Type
        </Box>
        <TextField
          fullWidth
          select
          name="testType"
          value={values.testType}
          onChange={handleChange}
          error={!!errors.testType}
          helperText={errors.testType}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ScienceOutlined fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        >
          {TEST_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      

      {/* Optional Time Slot */}
     <Box sx={{ width: "100%" }}>
       <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
         Time Slot (optional)
       </Box>
       <TextField
         fullWidth
         select
         name="timeSlot"
         value={values.timeSlot}
         onChange={handleChange}
         sx={inputSx}
       >
         <MenuItem value="">— None —</MenuItem>
         {TIME_SLOTS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
       </TextField>
     </Box>

      {/* Submit button */}
      <Button
        type="submit"
        variant="contained"
        startIcon={<AddRounded />}
        sx={{
          gridColumn: { xs: "1 / -1", lg: "auto" }, // full width on small, inline on large
          height: 56,
          px: 3,
          borderRadius: 1.5,
          background: "linear-gradient(135deg, #1366D6 0%, #0A4CAC 100%)",
          boxShadow: "0 4px 10px rgba(19,102,214,0.25)",
          "&:hover": { boxShadow: "0 6px 14px rgba(19,102,214,0.35)" },
          justifySelf: { xs: "stretch", lg: "start" },
        }}
      >
        CREATE JOB
      </Button>
    </Box>
  </Box>
);


}

// src/components/lab/LabJobForm.jsx
import React, { useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import PersonOutline from "@mui/icons-material/PersonOutline";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import AddRounded from "@mui/icons-material/AddRounded";

/* Suggestions only (freeSolo is enabled). Keep Cholesterol & Diabetes. */
const SUGGESTIONS = [
  "Cholesterol",
  "Diabetes",
  "Lipid Profile",
  "Full Blood Count",
  "Liver Function",
  "Kidney Function",
  "Creatinine",
  "Urea",
  "Bilirubin",
  "Electrolytes",
  "Fasting Glucose",
  "Random Glucose",
  "Thyroid Profile",
  "Hemoglobin",
  "Vitamin D",
  "CRP",
  "ESR",
  "Urine Routine",
  "Stool Culture",
];

const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night"];

// Tests that *require* picking a time slot
const SLOT_REQUIRED_FOR = [
  "Fasting Glucose",
  "Random Glucose",
  "Post Prandial Glucose",
  "OGTT",
  "Glucose Tolerance",
  "Insulin"
];
const isSlotRequired = (label = "") =>
  SLOT_REQUIRED_FOR.some(t => label.toLowerCase().includes(t.toLowerCase()));


/* ---------------- helpers ---------------- */

const oneSpace = (s = "") => s.trim().replace(/\s+/g, " ");
const nameCharOK = (ch) => /^[A-Za-z\s]$/.test(ch);
const testCharOK = (ch) => /^[A-Za-z\s]$/.test(ch);
const sanitize = (s = "", charOK) => s.split("").filter(charOK).join("");

const IMAGING_BLOCK =
  /(?:^|\b)(xray|x-ray|ultrasound|ct\b|mri\b|dicom)(?:\b|$)/i;

// ✅ Final validation (submit-time): last block 2–4 digits
const PID_FINAL_RE = /^P2025\/\d{3}\/\d{2,4}$/;

// Live typing/paste guard (allows partial stages)
// P2025 / N{0..3} [ / N{0..4} ]
 const PID_PARTIAL_RE = /^P2025(?:\/\d{0,3}(?:\/\d{0,4})?)?$/; 

const PID_PREFIX = "P2025/";
const PID_MAX = 14; // P2025/ + 3 + / + 4

function expectAt(idx) {
  if (idx < 6) return PID_PREFIX[idx];      // P2025/
  if (idx >= 6 && idx <= 8) return "digit"; // 3 digits
  if (idx === 9) return "/";                // slash
  if (idx >= 10 && idx <= 13) return "digit"; // last 2–4 digits (max 4)
  return null;
}

export default function LabJobForm({ onSubmit }) {
  const [values, setValues] = useState({
    patientName: "",
    patientId: "",
    testType: "",
    timeSlot: "",
  });
  const [inputTestType, setInputTestType] = useState("");
  const [errors, setErrors] = useState({});

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

  const setField = (name, value) => {
    setValues((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };

  /* ---------------- validation on submit ---------------- */
  const validate = () => {
    const e = {};

    // Name
    const nm = oneSpace(values.patientName);
    if (!nm) e.patientName = "Required";
    else if (!/^[A-Za-z]+(?:[A-Za-z\s]*[A-Za-z])?$/.test(nm)) {
      e.patientName = "Letters and spaces only.";
    }

    // Patient ID
    const pid = values.patientId.trim();
    if (!pid) e.patientId = "Required";
    else if (!PID_FINAL_RE.test(pid)) {
      e.patientId =
        "Must be P2025/NNN/NN–NNNN (e.g., P2025/123/45 or P2025/123/4567).";
    }

    // Test type
    const tt = oneSpace(values.testType);
    if (!tt) e.testType = "Required";
    else if (IMAGING_BLOCK.test(tt)) {
      e.testType =
        "PDF tests only. Imaging (X-ray/CT/MRI/Ultrasound) is not allowed.";
    } else if (!/^[A-Za-z]+(?:[A-Za-z\s]*[A-Za-z])?$/.test(tt)) {
      e.testType = "Letters and spaces only.";
    }

    // NEW: only require slot for timed tests
if (isSlotRequired(tt) && !values.timeSlot) {
  e.timeSlot = "Time Slot is required for this test.";
}

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      patientName: oneSpace(values.patientName),
      patientId: values.patientId.trim(),
      testType: oneSpace(values.testType),
      timeSlot: values.timeSlot  || undefined,
    });
  };

  /* ---------------- Patient ID key/paste guards ---------------- */
  const handlePidKeyDown = (e) => {
    const v = e.currentTarget.value;
    const start = e.currentTarget.selectionStart ?? v.length;
    const end = e.currentTarget.selectionEnd ?? v.length;

    const ctrl =
      e.ctrlKey || e.metaKey ||
      ["Backspace", "Delete", "Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key);
    if (ctrl) return;

    if (v.length >= PID_MAX && start === end) {
      e.preventDefault();
      return;
    }

    const exp = expectAt(start);
    if (exp == null || start > v.length) {
      e.preventDefault();
      return;
    }

    const ch = e.key;

    if (exp === "digit") {
      if (!/^\d$/.test(ch)) e.preventDefault();
      return;
    }
    if (exp === "/") {
      if (ch !== "/") e.preventDefault();
      return;
    }

    if (exp === "P") {
   if (ch !== "P") e.preventDefault();          // only uppercase P allowed
 } else if (ch !== exp) {
      e.preventDefault();
    }
  };

  const handlePidPaste = (e) => {
    const input = e.currentTarget;
    const text = (e.clipboardData || window.clipboardData).getData("text").trim();
    const before = input.value.slice(0, input.selectionStart ?? 0);
    const after = input.value.slice(input.selectionEnd ?? input.value.length);
    const proposed = (before + text + after).toUpperCase();

    if (!PID_PARTIAL_RE.test(proposed) || proposed.length > PID_MAX) {
      e.preventDefault();
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ p: 2, borderTop: "1px solid #e8eef7", display: "block" }}>
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

      {/* Grid */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "end",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
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
            onChange={(e) => setField("patientName", e.target.value)}
            error={!!errors.patientName}
            helperText={errors.patientName}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutline fontSize="small" />
                </InputAdornment>
              ),
              onKeyDown: (e) => {
                if (e.key.length === 1 && !nameCharOK(e.key)) e.preventDefault();
              },
              onPaste: (e) => {
                const txt = (e.clipboardData || window.clipboardData).getData("text");
                const sanitized = sanitize(txt, nameCharOK);
                if (sanitized !== txt) {
                  e.preventDefault();
                  setField("patientName", oneSpace(values.patientName + sanitized));
                }
              },
            }}
            sx={inputSx}
          />
        </Box>

        {/* Patient ID */}
        <Box sx={{ width: "100%" }}>
          <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
            Patient ID (e.g., P2025/123/4567)
          </Box>
          <TextField
            fullWidth
            placeholder="P2025/123/45 or P2025/123/4567"
            name="patientId"
            value={values.patientId}
            onChange={(e) => setField("patientId", e.target.value)}
            onBlur={(e) => setField("patientId", e.target.value.trim())}
            error={!!errors.patientId}
            
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeOutlined fontSize="small" />
                </InputAdornment>
              ),
              onKeyDown: handlePidKeyDown,
              onPaste: handlePidPaste,
            }}
            inputProps={{ maxLength: PID_MAX }}
            sx={inputSx}
          />
        </Box>

        {/* Test Type (PDF only) */}
        <Box sx={{ width: "100%" }}>
          <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
            Test Type (PDF only)
          </Box>
          <Autocomplete
            freeSolo
            disableClearable
            autoHighlight
            options={SUGGESTIONS}
            value={values.testType}
            inputValue={inputTestType}
            onInputChange={(_, newInput) => setInputTestType(sanitize(newInput, testCharOK))}
            onChange={(_, newVal) => {
              const label = typeof newVal === "string" ? newVal : newVal || "";
              setField("testType", oneSpace(label));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                placeholder="e.g., Cholesterol or Diabetes"
                error={!!errors.testType}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScienceOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                  onKeyDown: (e) => {
                    if (e.key.length === 1 && !testCharOK(e.key)) e.preventDefault();
                  },
                  onPaste: (e) => {
                    const txt = (e.clipboardData || window.clipboardData).getData("text");
                    const sanitized = sanitize(txt, testCharOK);
                    if (sanitized !== txt) {
                      e.preventDefault();
                      setInputTestType(sanitize(inputTestType + txt, testCharOK));
                    }
                  },
                }}
                sx={inputSx}
              />
            )}
          />
        </Box>

        {/* Time Slot (optional) */}
        <Box sx={{ width: "100%" }}>
          <Box sx={{ fontSize: 16, fontWeight: 600, color: "#333", mb: 1 }}>
            Time Slot (optional)
          </Box>
          <TextField
  fullWidth
  select
  name="timeSlot"
  value={values.timeSlot}
  onChange={(e) => setField("timeSlot", e.target.value)}
  error={!!errors.timeSlot}
  helperText={errors.timeSlot}
  sx={inputSx}
>
  <MenuItem value="">— None —</MenuItem>
  {TIME_SLOTS.map((s) => (
    <MenuItem key={s} value={s}>{s}</MenuItem>
  ))}
</TextField>

        </Box>

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          startIcon={<AddRounded />}
          sx={{
            gridColumn: { xs: "1 / -1", lg: "auto" },
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

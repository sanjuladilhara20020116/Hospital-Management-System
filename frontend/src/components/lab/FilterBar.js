import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  InputAdornment,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import TagOutlined from "@mui/icons-material/TagOutlined";
import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import CleaningServicesOutlined from "@mui/icons-material/CleaningServicesOutlined";

/** suggestions (PDF tests only; no imaging) */
const COMMON_TESTS = [
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
  "HbA1c",
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

// light typing sanitiser only for test-type box
const allowedChar = (ch) => /^[A-Za-z0-9\s/\-\+\(\)]$/.test(ch);
const sanitizeWhole = (s = "") => s.split("").filter((c) => allowedChar(c)).join("");
const cleanSpaces = (s = "") => s.trim().replace(/\s+/g, " ");

const AUTO_DELAY_MS = 500;

export default function FilterBar({ status, onApply, onClear }) {
  const [patientId, setPatientId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [testType, setTestType] = useState("");           // committed option/value
  const [inputTestType, setInputTestType] = useState(""); // what's being typed

  // used to prevent the extra auto-apply right after pressing Clear
  const skipNextAutoRef = useRef(false);

  // centralised "Clear everything"
  const clearAll = () => {
    setPatientId("");
    setReferenceNo("");
    setTestType("");
    setInputTestType("");
    skipNextAutoRef.current = true; // avoid a duplicate auto-apply
    onClear?.({ status });
  };

  // Backspace-to-clear-all: if a focused field is already empty and user presses Backspace,
  // treat it as "clear all filters" for speed.
  const backspaceToClearAll = (e, value) => {
    if (e.key === "Backspace" && (value ?? "") === "") {
      // prevent pointless key repeat; just clear everything immediately
      e.preventDefault();
      clearAll();
    }
  };

  // Debounced auto-apply while typing (partial search supported)
  useEffect(() => {
    const params = { status };
    const pid = patientId.trim();
    const ref = referenceNo.trim();
    const tt  = cleanSpaces(inputTestType || testType);

    if (pid) params.patientId = pid;
    if (tt)  params.testType = tt;
    if (ref) params.referenceNo = ref;

    if (skipNextAutoRef.current) {
      skipNextAutoRef.current = false;
      return;
    }

    const t = setTimeout(() => onApply(params), AUTO_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, referenceNo, inputTestType, testType, status]);

  const manualApply = () => {
    const params = { status };
    if (patientId.trim())   params.patientId = patientId.trim();
    if ((inputTestType || testType).trim()) {
      params.testType = cleanSpaces(inputTestType || testType);
    }
    if (referenceNo.trim()) params.referenceNo = referenceNo.trim();
    onApply(params);
  };

  const inputSx = {
    width: "100%",
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
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: 2,
        borderRadius: 2,
        border: "1px solid #e5e7eb",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          alignItems: "end",
        }}
      >
        {/* Patient ID (partial search allowed) */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            Patient ID
          </Box>
          <TextField
            fullWidth
            placeholder="Search by Patient ID (any part)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => backspaceToClearAll(e, patientId)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
            helperText="Type last digits or any segment"
          />
        </Box>

        {/* Test Type with suggestions (free text) */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            Test Type (PDF only)
          </Box>
          <Autocomplete
            freeSolo
            disableClearable
            autoHighlight
            options={COMMON_TESTS}
            value={testType}
            inputValue={inputTestType}
            onInputChange={(_, v) => setInputTestType(sanitizeWhole(v))}
            onChange={(_, v) => setTestType(typeof v === "string" ? v : (v || ""))}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="e.g., Cholesterol"
                sx={inputSx}
                onKeyDown={(e) => backspaceToClearAll(e, inputTestType)}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScienceOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText="Letters & spaces; imaging tests not required"
              />
            )}
          />
        </Box>

        {/* Reference No (partial search allowed) */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            Reference No
          </Box>
          <TextField
            fullWidth
            placeholder="LB-2025-08-000123 or just 0123"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            onKeyDown={(e) => backspaceToClearAll(e, referenceNo)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TagOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
            helperText="Type any part"
          />
        </Box>

        {/* Buttons (optional; auto-apply already works) */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            gridColumn: { xs: "1 / -1", md: "1 / -1" },
            justifyContent: { xs: "stretch", md: "flex-end" },
            mt: 0.5,
          }}
        >
          <Button
            variant="outlined"
            onClick={clearAll}
            startIcon={<CleaningServicesOutlined />}
            sx={{
              borderColor: "#B9C7DF",
              color: "#234",
              bgcolor: "white",
              "&:hover": { borderColor: "#8AA4D4", bgcolor: "#f6f9ff" },
            }}
          >
            Clear
          </Button>

          <Button
            variant="contained"
            onClick={manualApply}
            startIcon={<FilterAltOutlined />}
            sx={{
              background: "linear-gradient(135deg, #1366D6 0%, #0A4CAC 100%)",
              boxShadow: "0 4px 10px rgba(19,102,214,0.25)",
              "&:hover": { boxShadow: "0 6px 14px rgba(19,102,214,0.35)" },
            }}
          >
            Apply
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

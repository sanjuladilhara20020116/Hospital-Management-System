import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  Button,
  Stack,
  InputAdornment,
} from "@mui/material";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import CleaningServicesOutlined from "@mui/icons-material/CleaningServicesOutlined";

const TEST_TYPES = [
  "Cholesterol",
  "Diabetes",
  "X-ray",
  "Full Blood Count",
  "Liver Function",
  "Kidney Function",
  "Other",
];

export default function FilterBar({ status, onApply, onClear }) {
  const [patientId, setPatientId] = useState("");
  const [testType, setTestType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const apply = () => {
    const params = { status };
    if (patientId) params.patientId = patientId;
    if (testType) params.testType = testType;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    onApply(params);
  };

  const clear = () => {
    setPatientId("");
    setTestType("");
    setDateFrom("");
    setDateTo("");
    onClear?.({ status });
  };

  // unified input styling
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
      {/* Responsive grid: 1 col (xs), 2 cols (sm), 4 cols (lg) */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          alignItems: "end",
        }}
      >
        {/* Patient ID */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            Patient ID
          </Box>
          <TextField
            fullWidth
            placeholder="Search by Patient ID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
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
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            Test Type
          </Box>
          <TextField
            select
            fullWidth
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            sx={inputSx}
          >
            <MenuItem value="">All Types</MenuItem>
            {TEST_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* From Date */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            From Date
          </Box>
          <TextField
            fullWidth
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </Box>

        {/* To Date */}
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 600, color: "#333", mb: 1 }}>
            To Date
          </Box>
          <TextField
            fullWidth
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonthOutlined fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </Box>

        {/* Actions: span full width on small; right-aligned on large */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            gridColumn: { xs: "1 / -1", lg: "auto" },
            justifyContent: { xs: "stretch", lg: "flex-end" },
          }}
        >
          <Button
            variant="outlined"
            onClick={clear}
            startIcon={<CleaningServicesOutlined />}
            sx={{
              borderColor: "#B9C7DF",
              color: "#234",
              bgcolor: "white",
              flex: { xs: 1, lg: "initial" },
              "&:hover": { borderColor: "#8AA4D4", bgcolor: "#f6f9ff" },
            }}
          >
            Clear
          </Button>

          <Button
            variant="contained"
            onClick={apply}
            startIcon={<FilterAltOutlined />}
            sx={{
              flex: { xs: 1, lg: "initial" },
              background: "linear-gradient(135deg, #1366D6 0%, #0A4CAC 100%)",
              boxShadow: "0 4px 10px rgba(19,102,214,0.25)",
              "&:hover": {
                boxShadow: "0 6px 14px rgba(19,102,214,0.35)",
              },
            }}
          >
            Apply
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

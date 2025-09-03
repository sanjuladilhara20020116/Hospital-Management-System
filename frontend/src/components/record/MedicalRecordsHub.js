// src/components/record/MedicalRecordsHub.jsx
import React, { useMemo, useState } from "react";
import PrescriptionList from "./prescriptions/PrescriptionList";

import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RecordList from "./records/RecordList"; // shows list when "Record" is active

const SUBPARTS = [
  { key: "record", label: "Record" },
  { key: "prescription", label: "Prescription" },
  { key: "diagnosis", label: "Diagnosis card" },
  { key: "admission", label: "Admission Note" },
];

export default function MedicalRecordsHub({
  patientId,
  isDoctor = true,
  onAdd, // optional callback: onAdd(activeKey)
}) {
  const [section, setSection] = useState("med"); // "med" | "lab"
  const [active, setActive] = useState("record");
  const [createSignal, setCreateSignal] = useState(0); // increments only on Add
  const [createSignalPresc, setCreateSignalPresc] = useState(0); // ✅ for Prescription

  const activeLabel = useMemo(() => {
    const found = SUBPARTS.find((s) => s.key === active);
    return found ? found.label : "Record";
  }, [active]);

  // Ensure the create signal is cleared whenever we leave the "Record" view
  const goSection = (value) => {
    setSection(value);
    if (value !== "med") {
      setCreateSignal(0);        // leaving med -> clear record signal
      setCreateSignalPresc(0);   // leaving med -> clear prescription signal
    }
  };

  const goActive = (value) => {
    setActive(value);
    if (value !== "record") setCreateSignal(0);             // leaving record tab -> clear
    if (value !== "prescription") setCreateSignalPresc(0);  // leaving prescription tab -> clear
  };

  const handleAdd = () => {
    if (section !== "med") return;
    if (typeof onAdd === "function") onAdd(active);
    if (active === "record") setCreateSignal((n) => n + 1);             // open record create
    if (active === "prescription") setCreateSignalPresc((n) => n + 1); // open prescription create
  };

  const Segment = ({ value, children }) => {
    const selected = section === value;
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={() => goSection(value)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goSection(value)}
        sx={{
          p: 2.5,
          cursor: "pointer",
          outline: "none",
          ...(value === "lab"
            ? { borderLeft: (t) => `1px solid ${t.palette.divider}` }
            : {}),
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: selected ? "text.primary" : "text.disabled",
          }}
        >
          {children}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: (t) => `1px solid ${t.palette.divider}`,
          overflow: "hidden",
        }}
      >
        {/* Top selectable header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
            bgcolor: "background.paper",
          }}
        >
          <Segment value="med">Medical Records</Segment>
          <Segment value="lab">LAB Reports</Segment>
        </Box>

        {/* MEDICAL RECORDS TABS */}
        {section === "med" && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "background.paper",
              borderBottom: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Tabs
              value={active}
              onChange={(_e, v) => goActive(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTabs-flexContainer": { gap: 1 },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  minHeight: 0,
                  py: 1,
                  px: 2.25,
                  borderRadius: 999,
                  border: (t) => `1px solid ${t.palette.divider}`,
                  color: "text.primary", // unselected label color
                },
                // selected pill: blue bg + white text
                "& .MuiTab-root.Mui-selected": {
                  bgcolor: "primary.main",
                  borderColor: "primary.main",
                  color: "text.primary",
                },
                "& .MuiTab-root.Mui-selected .MuiTab-wrapper": {
                  color: "text.primary",
                },
              }}
            >
              {SUBPARTS.map((s) => (
                <Tab key={s.key} value={s.key} label={s.label} />
              ))}
            </Tabs>
          </Box>
        )}

        {/* Add button UNDER the bar (only for MED + doctor) */}
        {section === "med" && isDoctor && (
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              pb: 1,
              display: "flex",
              justifyContent: "flex-end",
              bgcolor: "transparent",
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 999 }}
            >
              {`Add ${activeLabel}`}
            </Button>
          </Box>
        )}

        {/* CONTENT AREA */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              p: 2.25,
              minHeight: 280,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Divider />

            {section === "med" ? (
              active === "record" ? (
                <RecordList
                  patientId={patientId}
                  isDoctor={isDoctor}
                  createSignal={createSignal} // only changes on Add click
                />
              ) : active === "prescription" ? (
                <PrescriptionList
                  patientId={patientId}
                  isDoctor={isDoctor}
                  createSignal={createSignalPresc} // only changes on Add click
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {activeLabel} section will be implemented next.
                </Typography>
              )
            ) : (
              // LAB REPORTS: selectable, intentionally blank
              <Stack sx={{ flex: 1 }} />
            )}
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}

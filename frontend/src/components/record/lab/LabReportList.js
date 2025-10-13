// src/components/record/lab/LabReportList.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Chip,
} from "@mui/material";

const API_BASE = "http://localhost:5000";

// small date helper
function fmtDate(d) {
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString();
  } catch {
    return "";
  }
}

/**
 * Props:
 *  - patientUserId: human code (e.g. "P2025/387/26") — used to fetch *files*
 *  - patientRefId:  kept for API compatibility; not used here
 *  - patientId:     legacy fallback prop name
 */
export default function LabReportList({ patientUserId, patientRefId, patientId }) {
  const humanId = patientUserId || patientId; // tolerate older callers

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!humanId) return;

    let cancelled = false;
    setLoading(true);
    setErr("");

    axios
      .get(`${API_BASE}/api/users/${encodeURIComponent(humanId)}/reports`)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data;
        const items = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
          ? payload
          : [];
        setFiles(items);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e?.response?.data?.message || e?.message || "Failed to load report files");
        setFiles([]);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [humanId]);

  const viewPdf = (item) => {
    // Prefer reference-based viewer; fallbacks included for robustness
    if (item?.referenceNo) {
      window.open(
        `${API_BASE}/api/reports/by-ref/${encodeURIComponent(item.referenceNo)}/view`,
        "_blank"
      );
      return;
    }
    if (item?._id) {
      window.open(`${API_BASE}/api/reports/${encodeURIComponent(item._id)}/view`, "_blank");
      return;
    }
    if (item?.portalDownloadUrl) {
      window.open(`${API_BASE}${item.portalDownloadUrl}`, "_blank");
      return;
    }
    if (item?.publicDownloadUrl) {
      window.open(`${API_BASE}${item.publicDownloadUrl}`, "_blank");
    }
  };

  return (
    <Box>
      {err && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {err}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          Files
        </Typography>
        <Divider sx={{ my: 1.5 }} />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : files.length === 0 ? (
          <Typography color="text.disabled">No report files found.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {files.map((f, i) => (
              <Paper
                key={f.referenceNo || f._id || i}
                variant="outlined"
                sx={{ p: 1.25, borderRadius: 1.5 }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.5}>
                    <Typography fontWeight={700}>
                      {f.testType || f.reportType || "Report"}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={fmtDate(f.uploadDate || f.createdAt || f.completedAt) || "—"}
                      />
                      {f.referenceNo && (
                        <Chip size="small" variant="outlined" label={f.referenceNo} />
                      )}
                      {f.isAnalyzed && <Chip size="small" color="success" label="Analyzed" />}
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" onClick={() => viewPdf(f)}>
                      View PDF
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Tip: use “View PDF” to open the original report in a new tab.
        </Typography>
      </Paper>
    </Box>
  );
}

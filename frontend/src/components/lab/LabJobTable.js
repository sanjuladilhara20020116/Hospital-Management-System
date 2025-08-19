// src/components/lab/LabJobTable.js
import React, { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Tooltip,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import RepeatIcon from "@mui/icons-material/Repeat";

// NEW icons for the Report chip
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import InsertPhotoOutlined from "@mui/icons-material/InsertPhotoOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";

import { alpha } from "@mui/material/styles";

const TEST_TYPES = [
  "Cholesterol",
  "Diabetes",
  "X-ray",
  "Full Blood Count",
  "Liver Function",
  "Kidney Function",
  "Other",
];

const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night"];

// small helpers
const getFileName = (p = "") => p.split("/").pop() || "";
const isPdf = (p = "") => /\.pdf$/i.test(p);
const isImage = (p = "") => /\.(png|jpe?g|webp)$/i.test(p);

// Reusable colored action pill
const ActionButton = ({ title, onClick, icon, color = "primary", disabled }) => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        sx={(theme) => {
          const base = theme.palette[color]?.main || theme.palette.primary.main;
          return {
            m: 0.25,
            borderRadius: 2,
            bgcolor: disabled ? "action.disabledBackground" : alpha(base, 0.1),
            color: disabled ? "action.disabled" : base,
            border: `1px solid ${
              disabled ? theme.palette.divider : alpha(base, 0.35)
            }`,
            boxShadow: disabled ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
            transition: "all .15s ease",
            "&:hover": {
              bgcolor: disabled ? "action.disabledBackground" : alpha(base, 0.18),
              transform: disabled ? "none" : "translateY(-1px)",
              boxShadow: disabled ? "none" : "0 6px 12px rgba(0,0,0,0.12)",
            },
          };
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);

export default function LabJobTable({
  rows = [],
  onRefresh,
  onUpload,
  onUpdate,
  onDelete,
  onDownload,
  onRepeat,
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const [editVals, setEditVals] = useState({
    patientName: "",
    patientId: "",
    testType: "",
    scheduledDate: "",
    timeSlot: "",
  });
  const [editErrs, setEditErrs] = useState({});

  const openUpload = (job) => {
    setSelectedJob(job);
    setFile(null);
    setError("");
    setUploadOpen(true);
  };

  const openEdit = (job) => {
    setSelectedJob(job);
    setEditVals({
      patientName: job.patientName || "",
      patientId: job.patientId || "",
      testType: job.testType || "",
      scheduledDate: job.scheduledDate
        ? new Date(job.scheduledDate).toISOString().slice(0, 16)
        : "",
      timeSlot: job.timeSlot || "",
    });
    setEditErrs({});
    setEditOpen(true);
  };

  const openDelete = (job) => {
    setSelectedJob(job);
    setDeleteOpen(true);
  };

  const doUpload = async () => {
    if (!file) return setError("Please choose a PDF/Image file");
    const ok = /\.(pdf|png|jpg|jpeg)$/i.test(file.name);
    if (!ok) return setError("Only PDF/PNG/JPG allowed");
    await onUpload(selectedJob._id, file);
    setUploadOpen(false);
  };

  const validateEdit = () => {
    const e = {};
    if (!editVals.patientName.trim()) e.patientName = "Required";
    if (!editVals.patientId.trim()) e.patientId = "Required";
    if (!editVals.testType) e.testType = "Required";
    if (!editVals.scheduledDate) e.scheduledDate = "Required";
    setEditErrs(e);
    return Object.keys(e).length === 0;
  };

  const doUpdate = async () => {
    if (!validateEdit()) return;
    await onUpdate(selectedJob._id, editVals);
    setEditOpen(false);
  };

  const doDelete = async () => {
    await onDelete(selectedJob._id);
    setDeleteOpen(false);
  };

  const statusChip = (status) =>
    status === "Completed" ? (
      <Chip
        label="COMPLETED"
        size="small"
        sx={{
          bgcolor: "#d1fae5",
          color: "#065f46",
          border: "1px solid #34d399",
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      />
    ) : (
      <Chip
        label="PENDING"
        size="small"
        sx={{
          bgcolor: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fbbf24",
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      />
    );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {rows.length === 0 ? (
        <Box p={3}>
          <Typography>No jobs yet.</Typography>
          <Button sx={{ mt: 1 }} onClick={onRefresh}>
            Refresh
          </Button>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table
            stickyHeader
            sx={{
              minWidth: 1000,
              "& thead th": {
                bgcolor: "#f8fafc",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#374151",
                borderBottom: "2px solid #e5e7eb",
              },
              "& tbody tr:hover": { backgroundColor: "rgba(0,102,204,0.04)" },
              "& tbody td": { fontSize: 14 },
              "& tbody td.mono": {
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              },
              "& td:last-of-type, & th:last-of-type": {
                width: 260,
                whiteSpace: "nowrap",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Patient</TableCell>
                <TableCell>Patient ID</TableCell>
                <TableCell>Reference No</TableCell>
                <TableCell>Test Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Report</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((r) => {
                const isCompleted = r.status === "Completed";
                const fname = getFileName(r.reportFile);

                return (
                  <TableRow key={r._id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{r.patientName}</TableCell>
                    <TableCell className="mono">{r.patientId}</TableCell>
                    <TableCell className="mono">{r.referenceNo}</TableCell>
                    <TableCell>{r.testType}</TableCell>
                    <TableCell>{statusChip(r.status)}</TableCell>

                    <TableCell>
                      {r.scheduledDate
                        ? new Date(r.scheduledDate).toLocaleString()
                        : "—"}
                      {r.timeSlot ? (
                        <Chip size="small" sx={{ ml: 1 }} label={r.timeSlot} />
                      ) : null}
                    </TableCell>

                    <TableCell>
                      {r.completedAt
                        ? new Date(r.completedAt).toLocaleString()
                        : "—"}
                    </TableCell>

                    {/* === POLISHED REPORT CELL (no long path) === */}
                    <TableCell>
                      {r.reportFile ? (
                        <Tooltip title={fname}>
                          <Chip
                            size="small"
                            variant="outlined"
                            onClick={() => onDownload && onDownload(r)}
                            icon={
                              isPdf(fname) ? (
                                <PictureAsPdfOutlined fontSize="small" />
                              ) : isImage(fname) ? (
                                <InsertPhotoOutlined fontSize="small" />
                              ) : (
                                <DescriptionOutlined fontSize="small" />
                              )
                            }
                            label={isPdf(fname) ? "PDF" : isImage(fname) ? "Image" : "Report"}
                            sx={{
                              cursor: "pointer",
                              fontWeight: 600,
                              borderColor: "#cbd5e1",
                              "&:hover": { bgcolor: "rgba(2,32,71,0.05)" },
                            }}
                          />
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <ActionButton
                        title={isCompleted ? "Download report" : "Report not available"}
                        onClick={() => onDownload && onDownload(r)}
                        icon={<DownloadIcon fontSize="small" />}
                        color="success"
                        disabled={!isCompleted}
                      />
                      <ActionButton
                        title="Repeat order (new reference)"
                        onClick={() => onRepeat && onRepeat(r)}
                        icon={<RepeatIcon fontSize="small" />}
                        color="primary"
                      />
                      <ActionButton
                        title="Upload report"
                        onClick={() => openUpload(r)}
                        icon={<UploadFileIcon fontSize="small" />}
                        color="info"
                        disabled={isCompleted}
                      />
                      <ActionButton
                        title="Edit job"
                        onClick={() => openEdit(r)}
                        icon={<EditIcon fontSize="small" />}
                        color="warning"
                        disabled={isCompleted}
                      />
                      <ActionButton
                        title="Delete job"
                        onClick={() => openDelete(r)}
                        icon={<DeleteIcon fontSize="small" />}
                        color="error"
                        disabled={isCompleted}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Upload Report</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doUpload}>Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Job</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            sx={{ mb: 2 }}
            label="Patient Name"
            name="patientName"
            value={editVals.patientName}
            onChange={(e) => setEditVals((v) => ({ ...v, patientName: e.target.value }))}
            error={!!editErrs.patientName}
            helperText={editErrs.patientName}
          />
          <TextField
            fullWidth
            sx={{ mb: 2 }}
            label="Patient ID (e.g., P2025/123/1)"
            name="patientId"
            value={editVals.patientId}
            onChange={(e) => setEditVals((v) => ({ ...v, patientId: e.target.value }))}
            error={!!editErrs.patientId}
            helperText={editErrs.patientId}
          />
          <TextField
            select
            fullWidth
            sx={{ mb: 2 }}
            label="Test Type"
            name="testType"
            value={editVals.testType}
            onChange={(e) => setEditVals((v) => ({ ...v, testType: e.target.value }))}
            error={!!editErrs.testType}
            helperText={editErrs.testType}
          >
            {TEST_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            type="datetime-local"
            label="Scheduled Date & Time"
            name="scheduledDate"
            InputLabelProps={{ shrink: true }}
            value={editVals.scheduledDate}
            onChange={(e) => setEditVals((v) => ({ ...v, scheduledDate: e.target.value }))}
            error={!!editErrs.scheduledDate}
            helperText={editErrs.scheduledDate}
          />

          <TextField
            select
            fullWidth
            sx={{ mt: 2 }}
            label="Time Slot (optional)"
            name="timeSlot"
            value={editVals.timeSlot}
            onChange={(e) => setEditVals((v) => ({ ...v, timeSlot: e.target.value }))}
          >
            <MenuItem value="">— None —</MenuItem>
            {TIME_SLOTS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doUpdate}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Job</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this job? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

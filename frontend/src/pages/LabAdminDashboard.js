import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Grid,
  Chip,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DoneAllRounded from "@mui/icons-material/DoneAllRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import InsertDriveFileRounded from "@mui/icons-material/InsertDriveFileRounded";
import LabJobForm from "../components/lab/LabJobForm";
import LabJobTable from "../components/lab/LabJobTable";
import FilterBar from "../components/lab/FilterBar";
import StatCard from "../components/lab/StatCard";

import API from "../api";






export default function LabAdminDashboard() {
  const [tab, setTab] = useState(0);

  const [pendingJobs, setPendingJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);

  const [pendingFilter, setPendingFilter] = useState({
    status: "Pending",
    page: 1,
    limit: 25,
  });
  const [completedFilter, setCompletedFilter] = useState({
    status: "Completed",
    page: 1,
    limit: 25,
  });

  const [toast, setToast] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isLabAdmin = currentUser?.role === "LabAdmin";

  // --- Fetchers (memoized) ---
  const fetchPending = useCallback(async () => {
    try {
      const res = await API.get("/api/lab-jobs", { params: pendingFilter });
      setPendingJobs(res.data?.items || []);
    } catch (e) {
      showToast("error", e.response?.data?.message || "Failed to load pending jobs");
    }
  }, [pendingFilter]);

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await API.get("/api/lab-jobs", { params: completedFilter });
      setCompletedJobs(res.data?.items || []);
    } catch (e) {
      showToast("error", e.response?.data?.message || "Failed to load completed jobs");
    }
  }, [completedFilter]);

  // in LabAdminDashboard.js
const [repeatingId, setRepeatingId] = useState(null);

const handleRepeat = async (job) => {
  try {
    setRepeatingId(job._id);

    // optional: choose a new scheduled date; here we default to now
    const payload = {}; // or { scheduledDate: new Date().toISOString() }

    const res = await API.post(`/api/lab-jobs/${job._id}/repeat`, payload);
    const newJob = res.data;

    // Optimistically prepend to the Pending list
    setPendingJobs((prev) => [newJob, ...prev]);

    // optional: jump to Pending tab so it’s visible
    setTab(1);

    showToast('success', `Repeat created: ${newJob.referenceNo || ''}`.trim());
  } catch (e) {
    showToast('error', e.response?.data?.message || 'Repeat failed');
  } finally {
    setRepeatingId(null);
  }
};


 

  // Re-fetch when filters (or role) change
  useEffect(() => {
    if (isLabAdmin) fetchPending();
  }, [isLabAdmin, fetchPending]);

  useEffect(() => {
    if (isLabAdmin) fetchCompleted();
  }, [isLabAdmin, fetchCompleted]);

  // --- Create / Upload / Update / Delete / Download ---
  const handleCreate = async (values) => {
    try {
      await API.post("/api/lab-jobs", values);
      showToast("success", "Job created");
      setTab(1); // jump to Pending tab
      fetchPending(); // refresh pending list
    } catch (e) {
      const apiMsg = e.response?.data?.message;
      const apiErr = e.response?.data?.errors?.[0]?.msg;
      showToast("error", apiErr || apiMsg || "Create failed");
      console.error("Create job error:", e.response?.data || e);
    }
  };

  const handleUpload = async (jobId, file) => {
    const form = new FormData();
    form.append("reportFile", file);
    try {
      await API.post(`/api/lab-jobs/${jobId}/report`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("success", "Report uploaded");
      // Moves from Pending -> Completed, so refresh both
      fetchPending();
      fetchCompleted();
    } catch (e) {
      showToast("error", e.response?.data?.message || "Upload failed");
    }
  };

  const handleUpdate = async (jobId, updates) => {
    try {
      await API.put(`/api/lab-jobs/${jobId}`, updates);
      showToast("success", "Job updated");
      fetchPending();
      fetchCompleted();
    } catch (e) {
      const apiMsg = e.response?.data?.message;
      const apiErr = e.response?.data?.errors?.[0]?.msg;
      showToast("error", apiErr || apiMsg || "Update failed");
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await API.delete(`/api/lab-jobs/${jobId}`);
      showToast("success", "Job deleted");
      fetchPending(); // delete allowed only for Pending
    } catch (e) {
      const apiMsg = e.response?.data?.message;
      showToast("error", apiMsg || "Delete failed");
    }
  };

  const handleDownload = async (job) => {
    try {
      const res = await API.get(`/api/lab-jobs/${job._id}/download`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers["content-type"] || "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = (job.reportFile || "report").split("/").pop();
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const apiMsg = e.response?.data?.message;
      showToast("error", apiMsg || "Download failed");
    }
  };

  // --- Filters: only update state; effects will fetch ---
  const applyPendingFilter = (params) => {
    setPendingFilter((prev) => ({ ...prev, ...params, page: 1 }));
  };
  const clearPendingFilter = () => {
    setPendingFilter({ status: "Pending", page: 1, limit: 25 }); // defaults only
  };

  const applyCompletedFilter = (params) => {
    setCompletedFilter((prev) => ({ ...prev, ...params, page: 1 }));
  };
  const clearCompletedFilter = () => {
    setCompletedFilter({ status: "Completed", page: 1, limit: 25 });
  };

  if (!isLabAdmin) {
    return (
      <Box p={4}>
        <Typography variant="h6">Not authorized. Please log in as Lab Admin.</Typography>
      </Box>
    );
  }

  // Simple derived value (no hook)
  const totalJobs = pendingJobs.length + completedJobs.length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc" }}>
      {/* Header card with gradient */}
      <Paper
        sx={{
          mb: 3,
          overflow: "hidden",
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,.08)",
        }}
      >
        <Box
          sx={{
            p: { xs: 3, md: 4 },
            color: "white",
            background: "linear-gradient(135deg,#0066cc 0%, #004899 100%)",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              right: -10,
              top: -10,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,.15) 0%, transparent 70%)",
            },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
            >
              <InsertDriveFileRounded sx={{ fontSize: 40 }} />
              <Box>
                <Typography
                  sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}
                >
                  Lab Administration
                </Typography>
                <Typography sx={{ opacity: 0.95 }}>
                  Manage laboratory test jobs and reports
                </Typography>
              </Box>
            </Box>

            <Box
  sx={{
    mt: 1,
    display: "grid",
    gap: 2,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  }}
>
  <StatCard tone="pending"   icon={<ScheduleRounded />}       label="Pending Jobs"    value={pendingJobs.length} />
  <StatCard tone="completed" icon={<DoneAllRounded />}        label="Completed Today" value={completedJobs.length} />
  <StatCard tone="total"     icon={<InsertDriveFileRounded />} label="Total Jobs"     value={pendingJobs.length + completedJobs.length} />
</Box>

          </Box>
        </Box>
      </Paper>

      {/* Main card with tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid #e5e7eb",
            ".MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              color: "#6b7280",
            },
            ".Mui-selected": {
              color: "#0066cc !important",
              backgroundColor: "rgba(0,102,204,0.04)",
            },
            ".MuiTabs-indicator": {
              height: 3,
              background:
                "linear-gradient(135deg,#0066cc 0%, #004899 100%)",
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab label="Create Job" iconPosition="start" icon={<UploadFileIcon />} />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Pending <Chip size="small" label={pendingJobs.length} />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Completed <Chip size="small" label={completedJobs.length} />
              </Box>
            }
          />
        </Tabs>

        <Box sx={{ p: { xs: 2.5, md: 4 } }}>
          {tab === 0 && <LabJobForm onSubmit={handleCreate} />}

          {tab === 1 && (
            <>
              <FilterBar
                status="Pending"
                onApply={applyPendingFilter}
                onClear={clearPendingFilter}
              />
              <LabJobTable
                rows={pendingJobs}
                onRefresh={fetchPending}
                onUpload={handleUpload}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onRepeat={handleRepeat}
              />
            </>
          )}

          {tab === 2 && (
            <>
              <FilterBar
                status="Completed"
                onApply={applyCompletedFilter}
                onClear={clearCompletedFilter}
              />
              <LabJobTable
                rows={completedJobs}
                onRefresh={fetchCompleted}
                onUpload={handleUpload}     // disabled for completed inside table
                onUpdate={handleUpdate}     // disabled for completed inside table
                onDelete={handleDelete}     // disabled for completed inside table
                onDownload={handleDownload} // enabled for completed
                onRepeat={handleRepeat}
              />
            </>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

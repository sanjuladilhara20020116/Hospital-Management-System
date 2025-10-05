// src/components/record/records/RecordList.js
import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, CardActions, Typography, Button,
  Stack, Alert, IconButton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import axios from "axios";
import RecordFormDialog from "./RecordFormDialog";
import RecordViewDialog from "./RecordViewDialog";
import { downloadFile } from "../../../utils/download";

const API_BASE = "http://localhost:5000";

// small util to avoid dayjs
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (v) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function RecordList({ patientId, isDoctor, createSignal = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(null); // item or null
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm] = useState(null); // id to delete

  // filters
  const [filters, setFilters] = useState({ q: "", doctor: "", from: "", to: "" });
  const onFilterChange = (e) =>
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const buildUrl = () => {
    const qs = new URLSearchParams();
    if (filters.q.trim()) qs.append("q", filters.q.trim()); // chief complaint (live)
    if (filters.doctor.trim()) qs.append("doctor", filters.doctor.trim());
    if (filters.from) qs.append("dateFrom", filters.from);
    if (filters.to) qs.append("dateTo", filters.to);
    const base = `${API_BASE}/api/clinical-records/patient/${encodeURIComponent(
      patientId
    )}`;
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };

  const load = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      setErr("");
      const res = await axios.get(buildUrl());
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // live search on chief complaint
  useEffect(() => {
    if (!patientId) return;
    const id = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, patientId]);

  // open form when parent triggers create
  useEffect(() => {
    if (createSignal > 0) setOpenForm(true);
  }, [createSignal]);

  const handleCreated = (item) => setItems((prev) => [item, ...prev]);
  const handleUpdated = (item) =>
    setItems((prev) =>
      prev.map((r) => (String(r._id) === String(item._id) ? item : r))
    );

  const onDelete = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/clinical-records/${encodeURIComponent(id)}`
      );
      setItems((prev) => prev.filter((r) => String(r._id) !== String(id)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to delete record");
    } finally {
      setConfirm(null);
    }
  };

  const clearFilters = () => {
    setFilters({ q: "", doctor: "", from: "", to: "" });
    setTimeout(load, 0);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const nothingFound = !loading && items.length === 0;

  return (
    <Box>
      {/* Filter bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          label="Chief complaint (live)"
          name="q"
          value={filters.q}
          onChange={onFilterChange}
          fullWidth
        />
        <TextField
          label="Doctor (name or ID)"
          name="doctor"
          value={filters.doctor}
          onChange={onFilterChange}
          sx={{ minWidth: 200 }}
        />
        <TextField
          type="date"
          label="From"
          name="from"
          value={filters.from}
          onChange={onFilterChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          type="date"
          label="To"
          name="to"
          value={filters.to}
          onChange={onFilterChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={load}>
            Search
          </Button>
          <Button variant="text" onClick={clearFilters}>
            Clear
          </Button>
        </Stack>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {err}
        </Alert>
      )}

      {nothingFound && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {filters.q.trim() ? (
            <>
              No records match "<strong>{filters.q}</strong>"
            </>
          ) : (
            "No records found"
          )}
        </Alert>
      )}

      <Stack spacing={2}>
        {items.map((it) => (
          <Card key={it._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {it.chiefComplaint || "—"}
              </Typography>

              <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 0.5 }}
                flexWrap="wrap"
              >
                <Typography variant="body2" color="text.secondary">
                  <strong>Record ID:</strong> {it.recordId || it._id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Doctor:</strong> {it.doctorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date & Time:</strong> {fmtDate(it.visitDateTime)}
                </Typography>
              </Stack>
            </CardContent>

            <CardActions sx={{ pt: 0.5, pb: 1.5, px: 2 }}>
              <Button
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => setOpenView(it)}
              >
                View
              </Button>

              {/* ✅ Download PDF is available to both doctors and patients */}
              <Button
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={() =>
                  downloadFile(
                    `${API_BASE}/api/clinical-records/${encodeURIComponent(
                      it._id
                    )}/pdf`,
                    `Record_${it.recordId || it._id}.pdf`
                  )
                }
              >
                Download PDF
              </Button>

              {/* Edit/Delete only for doctors */}
              {isDoctor && (
                <>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditItem(it)}
                  >
                    Edit
                  </Button>
                  <IconButton
                    color="error"
                    onClick={() => setConfirm(it._id)}
                    sx={{ ml: "auto" }}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            </CardActions>
          </Card>
        ))}
      </Stack>

      {/* Create */}
      <RecordFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        patientUserId={patientId}
        onCreated={(item) => {
          setOpenForm(false);
          handleCreated(item);
        }}
      />

      {/* Edit */}
      {editItem && (
        <RecordFormDialog
          open={!!editItem}
          onClose={() => setEditItem(null)}
          patientUserId={patientId}
          initialItem={editItem}
          onUpdated={(item) => {
            setEditItem(null);
            handleUpdated(item);
          }}
        />
      )}

      {/* View */}
      {openView && (
        <RecordViewDialog item={openView} onClose={() => setOpenView(null)} />
      )}

      {/* Confirm delete */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete record?</DialogTitle>
        <DialogContent>Action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => onDelete(confirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

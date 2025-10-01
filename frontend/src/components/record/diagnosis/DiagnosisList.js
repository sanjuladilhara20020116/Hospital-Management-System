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
import DiagnosisFormDialog from "./DiagnosisFormDialog";
import DiagnosisViewDialog from "./DiagnosisViewDialog";
import { downloadFile } from "../../../utils/download";

const API_BASE = "http://localhost:5000";
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (v) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DiagnosisList({ patientId, isDoctor, createSignal = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [filters, setFilters] = useState({ q: "", doctor: "", from: "", to: "" });
  const onFilterChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const buildUrl = () => {
    const qs = new URLSearchParams();
    if (filters.q.trim()) qs.append("q", filters.q.trim()); // Final Diagnosis (live)
    if (filters.doctor.trim()) qs.append("doctor", filters.doctor.trim());
    if (filters.from) qs.append("dateFrom", filters.from);
    if (filters.to) qs.append("dateTo", filters.to);
    const base = `${API_BASE}/api/diagnosis-cards/patient/${encodeURIComponent(patientId)}`;
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
      setErr(e?.response?.data?.message || "Failed to load diagnosis cards");
    } finally {
      setLoading(false);
    }
  };

  // initial fetch
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // 🔹 Live search on Final Diagnosis (debounced)
  useEffect(() => {
    if (!patientId) return;
    const id = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, patientId]);

  // open form when hub signals "Add"
  useEffect(() => { if (createSignal > 0) setOpenForm(true); }, [createSignal]);

  const handleCreated = (item) => setItems((prev) => [item, ...prev]);
  const handleUpdated = (item) =>
    setItems((prev) => prev.map((r) => (String(r._id) === String(item._id) ? item : r)));

  const onDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/diagnosis-cards/${encodeURIComponent(id)}`);
      setItems((p) => p.filter((r) => String(r._id) !== String(id)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to delete diagnosis card");
    } finally {
      setConfirm(null);
    }
  };

  const clearFilters = () => {
    setFilters({ q: "", doctor: "", from: "", to: "" });
    setTimeout(load, 0);
  };

  const nothingFound = !loading && items.length === 0;

  return (
    <Box>
      {/* Filter bar (kept mounted during loading) */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2, alignItems: "flex-end" }}
      >
        <TextField
          label="Final Diagnosis"
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
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" onClick={load}>Search</Button>
          <Button variant="text" onClick={clearFilters}>Clear</Button>
          {loading && <CircularProgress size={20} sx={{ ml: 0.5 }} />}
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}
      {nothingFound && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {filters.q.trim()
            ? <>No diagnosis cards match "<strong>{filters.q}</strong>"</>
            : "No diagnosis cards found"}
        </Alert>
      )}

      <Stack spacing={2} sx={{ opacity: loading ? 0.7 : 1, transition: "opacity .2s" }}>
        {items.map((it) => (
          <Card key={it._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {it.finalDiagnosis || "—"}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  <strong>DiagnosisCard ID:</strong> {it.diagnosisCardId}
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
              <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setOpenView(it)}>
                View
              </Button>
              {isDoctor && (
                <>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => setEditItem(it)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() =>
                      downloadFile(
                        `${API_BASE}/api/diagnosis-cards/${encodeURIComponent(it._id)}/pdf`,
                        `DiagnosisCard_${it.diagnosisCardId || it._id}.pdf`
                      )
                    }
                  >
                    Download PDF
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
      <DiagnosisFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        patientUserId={patientId}
        onCreated={(item) => { setOpenForm(false); handleCreated(item); }}
      />

      {/* Edit */}
      {editItem && (
        <DiagnosisFormDialog
          open={!!editItem}
          onClose={() => setEditItem(null)}
          patientUserId={patientId}
          initialItem={editItem}
          onUpdated={(item) => { setEditItem(null); handleUpdated(item); }}
        />
      )}

      {/* View */}
      {openView && <DiagnosisViewDialog item={openView} onClose={() => setOpenView(null)} />}

      {/* Confirm delete */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete diagnosis card?</DialogTitle>
        <DialogContent>Action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => onDelete(confirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

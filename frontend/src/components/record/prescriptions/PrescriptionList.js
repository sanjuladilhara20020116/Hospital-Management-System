import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, CardActions, Typography, Button,
  Stack, Alert, IconButton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import PrescriptionFormDialog from "./PrescriptionFormDialog";
import PrescriptionViewDialog from "./PrescriptionViewDialog";

const API_BASE = "http://localhost:5000";

// Tiny date formatter => "YYYY-MM-DD HH:mm"
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function PrescriptionList({ patientId, isDoctor, createSignal = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await axios.get(
        `${API_BASE}/api/prescriptions/patient/${encodeURIComponent(patientId)}`
      );
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (patientId) load(); }, [patientId]);

  // When hub triggers add
  useEffect(() => {
    if (createSignal > 0) setOpenForm(true);
  }, [createSignal]);

  const handleCreated = (item) => setItems((prev) => [item, ...prev]);
  const handleUpdated = (item) =>
    setItems((prev) => prev.map((r) => (String(r._id) === String(item._id) ? item : r)));

  const onDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/prescriptions/${encodeURIComponent(id)}`);
      setItems((prev) => prev.filter((r) => String(r._id) !== String(id)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to delete prescription");
    } finally {
      setConfirm(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}

      {!items.length && (
        <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
          No prescriptions found
        </Alert>
      )}

      <Stack spacing={2}>
        {items.map((it) => (
          <Card key={it._id} variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {it.chiefComplaint || "—"}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  <strong>Prescription ID:</strong> {it.prescriptionId}
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
      <PrescriptionFormDialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        patientUserId={patientId}
        onCreated={(item) => { setOpenForm(false); handleCreated(item); }}
      />

      {/* Edit */}
      {editItem && (
        <PrescriptionFormDialog
          open={!!editItem}
          onClose={() => setEditItem(null)}
          patientUserId={patientId}
          initialItem={editItem}
          onUpdated={(item) => { setEditItem(null); handleUpdated(item); }}
        />
      )}

      {/* View */}
      {openView && (
        <PrescriptionViewDialog item={openView} onClose={() => setOpenView(null)} />
      )}

      {/* Confirm delete */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>Delete prescription?</DialogTitle>
        <DialogContent>Action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => onDelete(confirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

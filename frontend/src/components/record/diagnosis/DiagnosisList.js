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
import DiagnosisFormDialog from "./DiagnosisFormDialog";
import DiagnosisViewDialog from "./DiagnosisViewDialog";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { downloadFile } from "../../../utils/download";


const API_BASE = "http://localhost:5000";

// "YYYY-MM-DD HH:mm"
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const fmtDate = (value) => {
  const d = new Date(value);
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

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await axios.get(
        `${API_BASE}/api/diagnosis-cards/patient/${encodeURIComponent(patientId)}`
      );
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load diagnosis cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (patientId) load(); }, [patientId]);

  // Open form when the hub signals "Add"
  useEffect(() => { if (createSignal > 0) setOpenForm(true); }, [createSignal]);

  const handleCreated = (item) => setItems((prev) => [item, ...prev]);
  const handleUpdated = (item) =>
    setItems((prev) => prev.map((r) => (String(r._id) === String(item._id) ? item : r)));

  const onDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/diagnosis-cards/${encodeURIComponent(id)}`);
      setItems((prev) => prev.filter((r) => String(r._id) !== String(id)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to delete diagnosis card");
    } finally {
      setConfirm(null);
    }
  };

  if (loading) {
    return <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}
      {!items.length && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          No diagnosis cards found
        </Alert>
      )}

      <Stack spacing={2}>
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
              <Button
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={() =>
                  downloadFile(
                    `http://localhost:5000/api/diagnosis-cards/${encodeURIComponent(it._id)}/pdf`,
                    `DiagnosisCard_${it.diagnosisCardId || it._id}.pdf`
                  )
                }
              >
                Download PDF
              </Button>

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
      {openView && (
        <DiagnosisViewDialog item={openView} onClose={() => setOpenView(null)} />
      )}

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

import React, { useMemo, useState } from "react";
import {
  Card, CardContent, CardActions, Box, Stack, Typography, Chip, Button,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Divider, Alert, LinearProgress
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const SEVERITIES = ["Mild", "Moderate", "Severe"];

function severityColor(level) {
  const v = String(level || "").toLowerCase();
  if (v.startsWith("sev")) return "error";
  if (v.startsWith("mod")) return "warning";
  return "default";
}

export default function AllergiesCard({
  title = "Allergies",
  items = [],                 // [{ id, substance, reaction, severity, notedOn, notes }]
  isDoctor = false,           // controls Add/Edit/Delete visibility
  loading = false,            // optional: show loading state
  onCreate,                   // fn(payload) -> void|Promise
  onUpdate,                   // fn(id, payload)
  onDelete,                   // fn(id)
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ substance: "", reaction: "", severity: "Mild", notedOn: "", notes: "" });
  const [err, setErr] = useState("");

  const emptyState = !loading && (items?.length === 0);

  const sorted = useMemo(() => {
    return [...(items || [])].sort((a, b) => String(a.substance).localeCompare(String(b.substance)));
  }, [items]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ substance: "", reaction: "", severity: "Mild", notedOn: "", notes: "" });
    setErr("");
  };

  const startAdd = () => {
    resetForm();
    setOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id || row._id || null);
    setForm({
      substance: row.substance || "",
      reaction: row.reaction || "",
      severity: row.severity || "Mild",
      notedOn: row.notedOn ? String(row.notedOn).substring(0, 10) : "",
      notes: row.notes || "",
    });
    setErr("");
    setOpen(true);
  };

  const handleSave = async () => {
    setErr("");
    const payload = {
      substance: (form.substance || "").trim(),
      reaction: (form.reaction || "").trim(),
      severity: form.severity,
      notedOn: form.notedOn || null,
      notes: (form.notes || "").trim(),
    };
    if (!payload.substance) {
      setErr("Substance is required");
      return;
    }
    try {
      setSaving(true);
      if (editingId) await onUpdate?.(editingId, payload);
      else await onCreate?.(payload);
      setOpen(false);
      resetForm();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Unable to update allergy");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    const ok = window.confirm("Delete this allergy? This cannot be undone.");
    if (!ok) return;
    try {
      await onDelete?.(id);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Unable to delete allergy");
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: (t) => `2px solid ${t.palette.divider}`,   // highlighted border
      }}
    >
      {loading && <LinearProgress />}

      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={800}>{title}</Typography>
          {isDoctor && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={startAdd} disabled={saving}>
              Add Allergy
            </Button>
          )}
        </Stack>

        {emptyState ? (
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: (t) => t.palette.action.hover, textAlign: "center" }}>
            <Typography color="text.secondary">
              No allergies recorded.
              {isDoctor && " Click “Add Allergy” to create one."}
            </Typography>
          </Box>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {sorted.map((row) => (
              <Stack
                key={row.id || row._id || row.substance}
                direction="row"
                alignItems="center"
                sx={{
                  border: (t) => `1px solid ${t.palette.divider}`,
                  borderRadius: 999,
                  px: 1,
                  py: 0.5,
                  mr: 1,
                  mb: 1,
                  background: (t) => t.palette.background.paper,
                }}
                spacing={0.5}
              >
                <Chip
                  size="small"
                  color={severityColor(row.severity)}
                  label={row.severity || "Mild"}
                  sx={{ height: 24 }}
                />
                <Typography variant="body2" sx={{ px: 0.5, fontWeight: 600 }}>
                  {row.substance}
                </Typography>
                {row.reaction && (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                    {row.reaction}
                  </Typography>
                )}
                {row.notedOn && (
                  <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                    {String(row.notedOn).substring(0, 10)}
                  </Typography>
                )}
                {isDoctor && (
                  <>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => startEdit(row)} disabled={saving}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => confirmDelete(row.id || row._id)}
                        disabled={saving}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Known allergies: {items?.length || 0}
        </Typography>
      </CardActions>

      {/* Add/Edit modal */}
      <Dialog open={open} onClose={() => (!saving && setOpen(false))} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? "Edit Allergy" : "Add Allergy"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {err && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Substance *"
              value={form.substance}
              onChange={(e) => setForm((s) => ({ ...s, substance: e.target.value }))}
              placeholder="Penicillin, Aspirin, Nuts, Seafood, Latex…"
              autoFocus
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Reaction"
              value={form.reaction}
              onChange={(e) => setForm((s) => ({ ...s, reaction: e.target.value }))}
              placeholder="Rash, swelling, anaphylaxis…"
              fullWidth
              disabled={saving}
            />
            <TextField
              select
              label="Severity"
              value={form.severity}
              onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))}
              fullWidth
              disabled={saving}
            >
              {SEVERITIES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="First Noted"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.notedOn}
              onChange={(e) => setForm((s) => ({ ...s, notedOn: e.target.value }))}
              fullWidth
              disabled={saving}
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Any extra context"
              multiline
              minRows={2}
              fullWidth
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

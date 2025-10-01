//doctoer ge availability eka check karana user haraha
// src/pages/appointments/AppointmentSearchPage.jsx
import React, { useState } from "react";
import {
  Box, Card, CardContent, TextField, MenuItem, Button, Stack, Typography,
  Grid, Chip, Divider, IconButton, Snackbar, Alert, CircularProgress,
  ownerDocument
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import API from "../../api";
import BookingDialog from "./BookingDialog";
import { rx } from "../../utils/validators";//validate
//special list
const SPECIALS = [
  { value: "Any", label: "Any Specialization" },
  { value: "Surgeon", label: "Surgeon" },
  { value: "Physician", label: "Physician" },
  { value: "Pediatrics", label: "Pediatrics" },
];

export default function AppointmentSearchPage() {
  const [q, setQ] = useState({ doctor: "", specialization: "Any", date: "" });
  const [alert, setAlert] = useState({ open: false, severity: "info", message: "" });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);               // [{doctorId, name, specialization}]
  const [expanded, setExpanded] = useState({});             // doctorId -> boolean
  const [sessions, setSessions] = useState({});             // doctorId -> {date, sessions: [...]}
  const [dialog, setDialog] = useState({ open: false, doctorId: "", doctorName: "", date: "", session: null });

  const show = (severity, message) => setAlert({ open: true, severity, message });

  const searchDoctors = async () => {
    if (!rx.doctorQuery.test(q.doctor)) {
      show("error", "Doctor: letters & spaces only (max 20)."); 
      return;
    }
    if (!rx.ymd.test(q.date)) {
      show("error", "Please pick a date.");
      return;
    }
    setLoading(true);
    try {
      const r = await API.get(`/api/users/search-doctors?query=${encodeURIComponent(q.doctor || "")}`);

      const raw = (r.data || []).map(d => ({
        doctorId: d.userId,
        name: `${d.firstName} ${d.lastName}`.trim(),
        specialization: (d.specialty || d.specialization || "Surgeon"),
      }));

      // ✅ Deduplicate by doctorId
      const unique = raw.filter((v, idx, arr) => idx === arr.findIndex(t => t.doctorId === v.doctorId));

      // Optional FE filter by specialization
      const filtered = q.specialization === "Any"
        ? unique
        : unique.filter(x => String(x.specialization).toLowerCase() === q.specialization.toLowerCase());

      setResults(filtered);
      if (!filtered.length) show("info", "No matching doctors found.");
    } catch (e) {
      show("error", "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (doctorId) => {
    const date = q.date;
    try {
      setExpanded(s => ({ ...s, [doctorId]: !s[doctorId] }));
      if (sessions[doctorId]) return; // already loaded
      const r = await API.get(`/api/appointments/doctors/${encodeURIComponent(doctorId)}/sessions`, { params: { date } });
      setSessions(s => ({ ...s, [doctorId]: r.data }));
    } catch {
      show("error", "Failed to load sessions.");
    }
  };

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Find a Doctor. Book an Appointment. Pay easy.
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Doctor - Max 20 Characters"
                fullWidth
                value={q.doctor}
                inputProps={{ maxLength: 20 }}
                onChange={(e) => {
                  const v = e.target.value;
                  if (rx.doctorQuery.test(v)) setQ(s => ({ ...s, doctor: v }));
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Specialization" fullWidth value={q.specialization}
                         onChange={(e) => setQ(s => ({ ...s, specialization: e.target.value }))}>
                {SPECIALS.map(sp => <MenuItem key={sp.value} value={sp.value}>{sp.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                type="date"
                label="Any Date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={q.date}
                onChange={(e) => setQ(s => ({ ...s, date: e.target.value }))}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<SearchIcon />} onClick={searchDoctors}>
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ textAlign: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Stack spacing={2}>
        {results.map(doc => {
          const open = !!expanded[doc.doctorId];
          const sess = sessions[doc.doctorId]?.sessions || [];
          return (
            <Card key={doc.doctorId} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{doc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{doc.specialization}</Typography>
                  </Box>
                  <IconButton onClick={() => fetchSessions(doc.doctorId)}>
                    {open ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Stack>

                {open && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      {q.date} • Sessions
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={1.5}>
                      {sess.length === 0 && (
                        <Typography color="text.secondary">No sessions.</Typography>
                      )}
                      {sess.map((s, i) => (
                        <Stack key={i}
                          direction={{ xs: "column", sm: "row" }}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          justifyContent="space-between"
                          sx={{ border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 2, p: 1.5 }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Chip label={`${s.range.start} – ${s.range.end}`} />
                            <Typography variant="body2" color="text.secondary">
                              Active Appointments: <b>{s.activeAppointments}</b> / {s.capacity}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              color={
                                s.statusLabel === "AVAILABLE" ? "success" :
                                s.statusLabel === "FULL" ? "error" : "default"
                              }
                              label={s.statusLabel}
                            />
                            <Button
                              variant="contained"
                              disabled={s.statusLabel !== "AVAILABLE"}
                              onClick={() => setDialog({
                                open: true,
                                doctorId: doc.doctorId,
                                doctorName: doc.name,
                                date: q.date,
                                session: s
                              })}
                            >
                              Book
                            </Button>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <BookingDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        doctorId={dialog.doctorId}
        doctorName={dialog.doctorName}
        date={dialog.date}
        session={dialog.session}
        onBooked={(appt) => {
          setDialog({ open: false });
          show("success", `Booked! Ref: ${appt.referenceNo}, Queue: ${appt.queueNo}`);
          setSessions(s => {
            const cp = { ...s };
            delete cp[dialog.doctorId];
            return cp;
          });
          setExpanded(e => ({ ...e, [dialog.doctorId]: false }));
        }}
      />

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} variant="filled">{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}

//special list 15-20
//validation part 34-38 doctor name validation 
//validation part 39-42 doctor date validation 
//api/users/search-doctors?query
//86-88  Find a Doctor. Book an Appointment. Pay easy(font)
//90-100 length eka name eke/ 122-24 search button
//169-174 activity appointment
//<BookingDialog 209-226(<you open the dialog with the selected doctor/date/session, and when booking succeeds you close the dialog, notify the user, clear stale capacity data, and collapse the section so the next expand shows fresh session stats.)
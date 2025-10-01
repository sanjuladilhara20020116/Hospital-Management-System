// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

/* -------------------- CORS (allow localhost + LAN IPs) -------------------- */
const STATIC_ALLOWED = new Set(
  [
    'http://localhost:3000',
    process.env.CLIENT_ORIGIN, // e.g. http://192.168.1.23:3000
    process.env.APP_BASE_URL,  // if it points at your React app
  ].filter(Boolean)
);
// allow http://localhost:<port> and http://<LAN-IP>:<port>
const LAN_REGEX = /^http:\/\/(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman/curl/same-origin
      if (STATIC_ALLOWED.has(origin) || LAN_REGEX.test(origin)) return cb(null, true);
      return cb(null, false); // silently block unknown origins
    },
    credentials: true,
  })
);

/* -------------------- Body parsers -------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* -------------------- Static for uploaded images -------------------- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -------------------- Health check -------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* -------------------- Routes (require + mount exactly once) -------------------- */
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const wardRoutes = require('./routes/wardRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const packageRoutes = require('./routes/packageRoutes');
const cartRoutes = require('./routes/cartRoutes');

const bookingRoutes = require('./routes/bookingRoutes');            // /api/bookings
const appointmentRoutes = require('./routes/appointmentRoutes');    // /api/appointments
const availabilityRoutes = require('./routes/availabilityRoutes');  // /api/availability

const vaccinationRoutes = require('./routes/vaccinations');         // /api/vaccinations
const userLookupRoutes = require('./routes/userLookup');            // /api/user-lookup (doctor-only)

const labJobRoutes = require('./routes/labJobRoutes');              // /api/lab-jobs
const userReportRoutes = require('./routes/userReportRoutes');      // /api/users (reports subset)
const publicReportRoutes = require('./routes/publicReportRoutes');  // /api/public/reports
const labReportRoutes = require('./routes/labReportRoutes');        // /api/reports

const diabetesRoutes = require('./routes/diabetesRoutes');          // /api/*
const analyzeRoutes = require('./routes/analyzeRoutes');            // /api/*
const cholesterolRoutes = require('./routes/cholesterol');          // /api/*

const allergyRoutes = require('./routes/allergyRoutes');            // /api/*
const clinicalRecordRoutes = require('./routes/clinicalRecordRoutes'); // /api/clinical-records
const prescriptionRoutes = require('./routes/prescriptionRoutes');     // /api/prescriptions
const diagnosisCardRoutes = require('./routes/diagnosisCardRoutes');   // /api/diagnosis-cards
const admissionNoteRoutes = require('./routes/admissionNoteRoutes');   // /api/admission-notes

/* Core feature mounts */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);                 // general user endpoints
app.use('/api/chat', chatRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/cart', cartRoutes);

/* Bookings & Appointments */
app.use('/api/bookings', bookingRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);

/* Vaccinations + patient lookup */
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/user-lookup', userLookupRoutes);

/* Lab modules / reports */
app.use('/api/lab-jobs', labJobRoutes);
app.use('/api/users', userReportRoutes);           // paths inside route files must avoid collisions
app.use('/api/public/reports', publicReportRoutes);
app.use('/api/reports', labReportRoutes);

/* Analytics & health tools grouped under /api */
app.use('/api', diabetesRoutes);
app.use('/api', analyzeRoutes);
app.use('/api', cholesterolRoutes);

/* Allied medical record features */
app.use('/api', allergyRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/diagnosis-cards', diagnosisCardRoutes);
app.use('/api/admission-notes', admissionNoteRoutes);

/* TEMP alias to support /api/by-ref/:referenceNo/view */
app.get('/api/by-ref/:referenceNo/view', (req, res) => {
  const ref = encodeURIComponent(req.params.referenceNo);
  res.redirect(302, `/api/reports/by-ref/${ref}/view`);
});

/* -------------------- Optional: placeholders (keep silent 200s) -------------------- */
app.get('/api/stats', (_req, res) => res.json({ patients: 0, doctors: 0, labs: 0 }));
app.get('/api/doctors/featured', (_req, res) => res.json([]));
app.get('/api/testimonials', (_req, res) => res.json([]));

/* -------------------- 404 for unknown API routes -------------------- */
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

/* -------------------- Global error handler -------------------- */
app.use((err, _req, res, _next) => {
  console.error('UNCAUGHT ERROR:', err);
  res.status(500).json({ message: 'Unexpected server error' });
});

/* -------------------- DB + start -------------------- */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthapp';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

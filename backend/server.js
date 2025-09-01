
// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS for React on :3000 (adjust CLIENT_ORIGIN if needed)
// ---- CORS (allow localhost AND your LAN IPs) ----


const STATIC_ALLOWED = new Set(
  [
    'http://localhost:3000',
    process.env.CLIENT_ORIGIN, // e.g. http://192.168.1.23:3000 if you set it
    process.env.APP_BASE_URL,  // if it points at your React app
  ].filter(Boolean)
);

// allow localhost:* and common LAN IPs like 192.168.x.x:3000
const LAN_REGEX = /^http:\/\/(?:localhost|\d{1,3}(?:\.\d{1,3}){3}):\d+$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman / curl / same-origin
      if (STATIC_ALLOWED.has(origin) || LAN_REGEX.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false); // silently block unknown origins
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));





// Static for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
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
const bookingRoutes = require('./routes/bookingRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/bookings', bookingRoutes);


/* -------------------- Lab module (NO JWT) -------------------- */
// These are your new routes. Ensure these files exist:
const labJobRoutes = require('./routes/labJobRoutes');           // uses middleware/actorLabAdmin inside
//const publicReportRoutes = require('./routes/publicReportRoutes');// public download by reference
app.use('/api/lab-jobs', labJobRoutes);
//app.use('/api/public/reports', publicReportRoutes);

/* -------------------- Optional: silence HomePage 404s -------------------- */
// Remove if you later build real handlers.
app.get('/api/stats', (_req, res) => res.json({ patients: 0, doctors: 0, labs: 0 }));
app.get('/api/doctors/featured', (_req, res) => res.json([]));
app.get('/api/testimonials', (_req, res) => res.json([]));

app.use('/api', require('./routes/diabetesRoutes'));



const userReportRoutes = require('./routes/userReportRoutes');
const publicReportRoutes = require('./routes/publicReportRoutes');

app.use('/api/users', userReportRoutes);
app.use('/api/public/reports', publicReportRoutes);


const labReportRoutes = require('./routes/labReportRoutes');
app.use('/api/reports', labReportRoutes);


const analyzeRoutes = require('./routes/analyzeRoutes');
app.use('/api', analyzeRoutes);

app.use("/api", require("./routes/cholesterol"));

const appointmentRoutes = require('./routes/appointmentRoutes');
app.use('/api/appointments', appointmentRoutes);

// ✅ Added routes:
app.use('/api/availability', require('./routes/availabilityRoutes'));
app.use('/api/appointments', require('./routes/bookingRoutes'));


//allergyRoutes
const allergyRoutes = require('./routes/allergyRoutes');
app.use('/api', allergyRoutes);

// Clinical Records (doctor visit notes) - additive
app.use('/api/clinical-records', require('./routes/clinicalRecordRoutes'));



/* -------------------- 404 for unknown API routes -------------------- */
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});



// Global error handler (optional but helpful)
app.use((err, req, res, next) => {
  console.error('UNCAUGHT ERROR:', err);
  res.status(500).json({ message: 'Unexpected server error' });
});

// DB + start
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

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

// CORS (React on :3000)
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes (make sure all these files exist and export a router)
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const wardRoutes = require("./routes/wardRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const supplierRoutes = require("./routes/supplierRoutes");

// New modules
const inventoryRoutes = require("./routes/inventoryRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const packageRoutes = require("./routes/packageRoutes");   // ✅ important
const cartRoutes = require("./routes/cartRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

// Mount
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/packages", packageRoutes);   // ✅ /api/packages now exists
app.use("/api/cart", cartRoutes);
app.use("/api/bookings", bookingRoutes);

// DB + start
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

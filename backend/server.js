const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

// ✅ CORS Setup — allow frontend on port 3000
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// ✅ Middleware
app.use(express.json());

// ✅ Serve static uploads (images, PDFs, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes"); // Optional
const wardRoutes = require("./routes/wardRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);       // ⬅️ AI chat (optional)
app.use("/api/wards", wardRoutes);      // ⬅️ Ward Management

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

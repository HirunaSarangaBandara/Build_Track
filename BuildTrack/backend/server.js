const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const laborRoutes = require("./routes/laborRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/labors", laborRoutes);

app.get("/", (req, res) => res.send("BuildTrack API is running..."));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
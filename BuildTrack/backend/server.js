const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path"); // <-- NEW: Import the path module

// --- Import the JWT Verification Middleware (CRITICAL FIX) ---
const { verifyToken } = require('./middleware/authMiddleware'); 

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- CRITICAL FIX: Serve the Uploads Folder using ABSOLUTE PATH ---
// We use path.join(__dirname, 'uploads') to ensure Express finds the folder
// regardless of the directory from which the 'node server.js' command is run.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// --- ROUTES IMPORTS ---
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const laborRoutes = require("./routes/laborRoutes");
const inventoryRoutes = require("./routes/InventoryRoutes"); 
const sitesTasksRoutes = require("./routes/sitesTasksRoutes"); 

app.use("/api/auth", authRoutes); // Login/Register routes are unprotected

// Apply the JWT verification middleware (verifyToken) to ALL SECURE ROUTES
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/labors", verifyToken, laborRoutes);    
app.use("/api/inventory", verifyToken, inventoryRoutes); 
app.use("/api/sites", verifyToken, sitesTasksRoutes); 

app.get("/", (req, res) => res.send("BuildTrack API is running..."));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
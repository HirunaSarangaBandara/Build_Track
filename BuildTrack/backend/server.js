const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path"); // Import the path module

// --- Import the JWT Verification Middleware ---
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
// This serves static files (like site images) from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// --- ROUTES IMPORTS ---
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const laborRoutes = require("./routes/laborRoutes");
const inventoryRoutes = require("./routes/InventoryRoutes"); 
const sitesTasksRoutes = require("./routes/sitesTasksRoutes"); 

// --- ROUTE IMPLEMENTATION ---

// 1. Unprotected Routes (Login, Register)
app.use("/api/auth", authRoutes); 

// 2. Protected Routes (Require JWT Verification)
// Apply the verifyToken middleware to all secure routes
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/labors", verifyToken, laborRoutes); 
app.use("/api/inventory", verifyToken, inventoryRoutes); 
app.use("/api/sites", verifyToken, sitesTasksRoutes); 

// Simple root endpoint
app.get("/", (req, res) => res.send("BuildTrack API is running..."));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
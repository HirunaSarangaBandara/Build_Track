const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path"); 
const fs = require("fs"); 
const http = require("http"); // Added for Socket.io
const { Server } = require("socket.io"); // Added for Socket.io

const { verifyToken } = require('./middleware/authMiddleware'); 

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // Wrap express app

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Update this to your frontend URL
        methods: ["GET", "POST", "PUT"]
    }
});

// Attach io to app so routes can access it
app.set("socketio", io);

app.use(cors());
app.use(express.json());

// Socket.io Connection Logic
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a private room based on User ID
    socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their private room`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Directories for Multer
const siteImagesDir = path.join(__dirname, 'uploads', 'site_images');
if (!fs.existsSync(siteImagesDir)) {
    fs.mkdirSync(siteImagesDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const laborRoutes = require("./routes/laborRoutes");
const inventoryRoutes = require("./routes/InventoryRoutes"); 
const sitesTasksRoutes = require("./routes/sitesTasksRoutes"); 
const messageRoutes = require("./routes/messageRoutes"); 

app.use("/api/auth", authRoutes); 
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/labors", verifyToken, laborRoutes); 
app.use("/api/inventory", verifyToken, inventoryRoutes); 
app.use("/api/sites", verifyToken, sitesTasksRoutes); 
app.use("/api/messages", verifyToken, messageRoutes); 

app.get("/", (req, res) => res.send("BuildTrack API is running..."));

const PORT = process.env.PORT || 5000;
// IMPORTANT: Change app.listen to server.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
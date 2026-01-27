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
const http = require('http');
const { Server } = require('socket.io');

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
const messageRoutes = require("./routes/messageRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// --- ROUTE IMPLEMENTATION ---

// 1. Unprotected Routes (Login, Register)
app.use("/api/auth", authRoutes); 

// 2. Protected Routes (Require JWT Verification)
// Apply the verifyToken middleware to all secure routes
app.use("/api/users", verifyToken, userRoutes);
app.use("/api/labors", verifyToken, laborRoutes); 
app.use("/api/inventory", verifyToken, inventoryRoutes); 
app.use("/api/sites", verifyToken, sitesTasksRoutes); 
app.use("/api/messages", verifyToken, messageRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);

// Simple root endpoint
app.get("/", (req, res) => res.send("BuildTrack API is running..."));

// Create HTTP server and attach Socket.IO so routes can emit events
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*', methods: ['GET', 'POST'] },
});
const Labor = require('./models/Labor');
const Message = require('./models/Message');
const ADMIN_ID = '000000000000000000000001';

// Expose io on the app so route handlers can access it via req.app.get('socketio')
app.set('socketio', io);

io.on('connection', (socket) => {
	console.log('Socket connected:', socket.id);

	socket.on('join', async (userId) => {
		try {
			if (!userId) return;
			socket.join(userId);
			// If this user is an admin in DB, also join the special ADMIN room
			try {
				const labor = await Labor.findById(userId).select('role').lean();
				if (labor && labor.role === 'admin') {
					socket.join(ADMIN_ID);
				}
			} catch (e) {
				// ignore DB errors here
			}
		} catch (err) {
			console.error('Error handling socket join:', err);
		}
	});

	socket.on('disconnect', () => {
		console.log('Socket disconnected:', socket.id);
	});
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
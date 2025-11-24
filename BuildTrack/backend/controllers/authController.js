const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // existing system users
const Labor = require("../models/Labor"); // new workers & managers

// Predefined Admin Credentials (MUST match middleware constants)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const ADMIN_ID = "000000000000000000000001"; 
const ADMIN_NAME = "System Administrator";

// Helper function to generate token with necessary payload
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
};

// --- LOGIN USER ---
exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check predefined admin credentials
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            // Payload MUST contain the static ID and role
            const token = generateToken({ id: ADMIN_ID, role: "admin" });

            return res.json({
                token,
                id: ADMIN_ID,              // CRITICAL: ID sent to frontend
                name: ADMIN_NAME,          // CRITICAL: Name sent to frontend
                role: "admin",             // CRITICAL: Role sent to frontend
                username: ADMIN_USERNAME,
                message: "Admin login successful",
            });
        }

        // Check in regular User collection (for Users)
        let user = await User.findOne({ username });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: "Invalid password" });

            const token = generateToken({ id: user._id, role: user.role });
            
            return res.json({
                token,
                id: user._id.toString(),
                name: user.name || user.username,
                role: user.role,
                username: user.username,
                message: "User login successful",
            });
        }

        // Check in Labor collection (for Managers/Workers/DB Admins)
        const labor = await Labor.findOne({
            $or: [{ username }, { email: username }],
        });

        if (!labor) return res.status(400).json({ message: "User not found" });

        const isPasswordMatch = await bcrypt.compare(password, labor.password);
        if (!isPasswordMatch)
            return res.status(400).json({ message: "Invalid password" });

        const token = generateToken({ id: labor._id, role: labor.role });

        res.json({
            token,
            id: labor._id.toString(),
            name: labor.name,
            role: labor.role,
            username: labor.username,
            email: labor.email,
            message: "Labor login successful",
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
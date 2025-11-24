const jwt = require("jsonwebtoken");
const Labor = require('../models/Labor'); 
const mongoose = require('mongoose'); 

// Consistent data used by the hardcoded Admin login in authController.js
const ADMIN_PLACEHOLDER_ID = "000000000000000000000001";
const ADMIN_NAME = "System Administrator";

exports.verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        let user;

        // --- BYPASS DB LOOKUP FOR HARDCODED ADMIN ---
        if (decoded.id === ADMIN_PLACEHOLDER_ID && decoded.role === 'admin') {
            // Success: Set user data directly, bypassing the Labor model lookup
            user = { 
                _id: decoded.id, 
                role: decoded.role, 
                name: ADMIN_NAME,
            };
        } 
        // --- STANDARD USER LOOKUP (if ID looks like a genuine Mongo ID) ---
        else if (mongoose.Types.ObjectId.isValid(decoded.id)) { 
            user = await Labor.findById(decoded.id).select('-password');
        } 
        
        // --- CHECK USER EXISTENCE ---
        if (!user) {
            // User not found (either deleted or invalid ID)
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }
        
        // Attach the validated user data needed for role checks to req.user
        req.user = {
            id: user._id.toString(),
            role: user.role, 
            name: user.name, 
        };

        next();
    } catch (error) {
        // Token is invalid, expired, or signature mismatch (usually due to JWT_SECRET difference)
        console.error("Token verification failed. Error:", error.message);
        res.status(403).json({ message: "Invalid token or token expired" });
    }
};

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // Check if req.user is set and if its role is included in the authorized roles list
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};
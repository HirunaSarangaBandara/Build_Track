const express = require("express");
const router = express.Router();
const Labor = require("../models/Labor");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authorizeRoles } = require('../middleware/authMiddleware'); 

// --- Helper Functions (unchanged) ---
function generatePassword() {
    try {
        const plainPassword = crypto.randomBytes(5).toString("hex"); 
        if (!plainPassword) {
            throw new Error("Crypto generation returned an empty string."); 
        }
        return plainPassword;
    } catch (err) {
        console.error("Crypto generation failed, using fallback:", err.message);
        return Math.random().toString(36).slice(-10); 
    }
}

function generateUsername(name) {
    return (
        name.toLowerCase().replace(/\s+/g, "") +
        Math.floor(1000 + Math.random() * 9000)
    );
}

// Setup email transporter (unchanged)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- GET all labors ---
router.get("/", async (req, res) => {
    try {
        const labors = await Labor.find().sort({ createdAt: -1 });
        res.json(labors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- POST new labor (ADMIN ONLY) ---
router.post("/", authorizeRoles('admin'), async (req, res) => {
    const { name, email, role, category, contact } = req.body; 

    try {
        const username = generateUsername(name);
        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newLabor = new Labor({
            name, email, username,
            password: hashedPassword,
            role, category, contact, 
            sites: [], // Initialized as an empty array
        });
        await newLabor.save();

        // Send email to user
        await transporter.sendMail({
            from: `"BuildTrack Admin" <${process.env.EMAIL_USER}>`,
            to: email, 
            subject: "Your BuildTrack Account Credentials",
            html: `
                <h2>Welcome to BuildTrack!</h2>
                <p>Hello <b>${name}</b>,</p>
                <p>Your BuildTrack account has been created.</p>
                <p><b>Username:</b> ${username}<br/>
                <b>Password:</b> ${plainPassword}</p>
                <p>You can now log in to your BuildTrack account.</p>
                <br/><p>Best regards,<br/>BuildTrack Admin Team</p>
            `,
        });

        res.status(201).json({
            message: "User created & credentials emailed",
            user: newLabor,
        });
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(400).json({ message: err.message }); 
    }
});

// --- PATCH labor by ID (for **WORKER** site assignment/release) ---
// Accepts 'site' (string or null) for backwards compatibility with the frontend worker assignment logic.
router.patch("/:id", authorizeRoles('admin', 'Manager'), async (req, res) => {
    const { site } = req.body; 
    const laborId = req.params.id;

    if (site === undefined) {
        return res.status(400).json({ message: "Only the 'site' field can be patched here." });
    }

    try {
        const laborToUpdate = await Labor.findById(laborId);
        if (!laborToUpdate) {
            return res.status(404).json({ message: "Cannot find user." });
        }
        
        // Ensure this route is only used for Worker roles
        if (laborToUpdate.role !== 'Worker') {
            return res.status(403).json({ message: "Forbidden: This endpoint is for managing Worker site assignment only." });
        }
        
        // Managers can only assign/release their Workers
        if (req.user.role === 'Manager' && laborToUpdate.role !== 'Worker') {
            return res.status(403).json({ message: "Forbidden: Managers can only modify Worker roles." });
        }
        
        // Perform the update on the 'sites' array for a Worker (max 1 site)
        laborToUpdate.sites = site ? [site] : []; 
        await laborToUpdate.save();

        res.json({ message: "Worker site updated successfully.", labor: laborToUpdate });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- NEW: PATCH route for Manager Site Assignment/Deassignment (ADMIN ONLY) ---
router.patch("/manager-site/:id", authorizeRoles('admin'), async (req, res) => {
    const laborId = req.params.id;
    const { siteName, action } = req.body; // action: 'assign' or 'deassign'

    if (!siteName || !action || !['assign', 'deassign'].includes(action)) {
        return res.status(400).json({ message: "Missing siteName or invalid action ('assign'/'deassign')." });
    }

    try {
        const laborToUpdate = await Labor.findById(laborId);
        if (!laborToUpdate || laborToUpdate.role !== 'Manager') {
            return res.status(404).json({ message: "Cannot find Manager user." });
        }

        if (action === 'assign') {
            if (!laborToUpdate.sites.includes(siteName)) {
                // Assign site using MongoDB $push operator
                await Labor.findByIdAndUpdate(laborId, { $push: { sites: siteName } });
                return res.json({ message: `Manager assigned to site ${siteName}.` });
            }
        } 
        
        if (action === 'deassign') {
            if (laborToUpdate.sites.includes(siteName)) {
                // Deassign site using MongoDB $pull operator
                await Labor.findByIdAndUpdate(laborId, { $pull: { sites: siteName } });
                return res.json({ message: `Manager deassigned from site ${siteName}.` });
            }
        }
        
        // Fetch and return the updated labor document (optional, but good practice)
        const updatedLabor = await Labor.findById(laborId);
        res.status(200).json({ message: `Manager's site list is already in the requested state.`, labor: updatedLabor });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- DELETE labor by ID (ADMIN ONLY) ---
router.delete("/:id", authorizeRoles('admin'), async (req, res) => {
    try {
        const labor = await Labor.findByIdAndDelete(req.params.id);

        if (labor == null) {
            return res.status(404).json({ message: "Cannot find labor" });
        }

        res.json({ message: "Labor user deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
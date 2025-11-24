// routes/laborRoute.js

const express = require("express");
const router = express.Router();
const Labor = require("../models/Labor");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authorizeRoles } = require('../middleware/authMiddleware'); // Import authorization middleware

// --- Helper Functions ---

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

// Setup email transporter using actual configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- GET all labors (Runs after verifyToken in server.js) ---
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
  const { name, email, role, category, contact, site } = req.body;

  try {
    const username = generateUsername(name);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newLabor = new Labor({
      name, email, username,
      password: hashedPassword,
      role, category, contact, site,
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
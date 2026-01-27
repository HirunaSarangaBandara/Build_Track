const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../models/Message");
const Labor = require("../models/Labor");

const ADMIN_ID = "000000000000000000000000";

// Ensure upload directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Only images (.jpg, .png) and PDFs are allowed!"));
    }
});

// GET recipients (List of contacts)
router.get("/recipients", async (req, res) => {
    try {
        const myId = req.user.role === "admin" ? ADMIN_ID : req.user.id;
        const currentUser = await Labor.findById(req.user.id);
        let users = [];

        if (req.user.role === "admin") {
            users = await Labor.find({}).select("name role sites").lean();
        } else if (currentUser) {
            const query = { 
                _id: { $ne: currentUser._id }, 
                sites: { $in: currentUser.sites || [] } 
            };
            if (currentUser.role === "Manager") query.role = "Worker";
            else if (currentUser.role === "Worker") query.role = "Manager";
            
            users = await Labor.find(query).select("name role sites").lean();
            if (currentUser.role === "Manager") {
                users.unshift({ _id: ADMIN_ID, name: "BuildTrack Admin", role: "admin", sites: ["System"] });
            }
        }

        const recipients = await Promise.all(users.map(async (u) => {
            const count = await Message.countDocuments({ sender: u._id, receiver: myId, read: false });
            return { ...u, unreadCount: count };
        }));
        res.json(recipients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST message (With File Support)
router.post("/", upload.single("attachment"), async (req, res) => {
    try {
        const senderId = req.user.role === "admin" ? ADMIN_ID : req.user.id;
        const { receiver, content } = req.body;

        let fileType = null;
        if (req.file) {
            fileType = req.file.mimetype.startsWith("image") ? "image" : "pdf";
        }

        const newMessage = new Message({
            sender: senderId,
            receiver: receiver,
            content: content || "",
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            fileName: req.file ? req.file.originalname : null,
            fileType: fileType,
            read: false
        });

        await newMessage.save();

        const io = req.app.get("socketio");
        if (io) io.to(receiver).emit("new_message", newMessage);

        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ message: "Server error sending message" });
    }
});

// GET chat history
router.get("/chat/:otherUserId", async (req, res) => {
    try {
        const myId = req.user.role === "admin" ? ADMIN_ID : req.user.id;
        const messages = await Message.find({
            $or: [{ sender: myId, receiver: req.params.otherUserId }, { sender: req.params.otherUserId, receiver: myId }]
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT mark as read
router.put("/read/:senderId", async (req, res) => {
    try {
        const myId = req.user.role === "admin" ? ADMIN_ID : req.user.id;
        await Message.updateMany({ sender: req.params.senderId, receiver: myId, read: false }, { $set: { read: true } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
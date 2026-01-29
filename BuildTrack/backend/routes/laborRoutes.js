const express = require("express");
const router = express.Router();
const Labor = require("../models/Labor");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { authorizeRoles } = require("../middleware/authMiddleware");

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

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
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
router.post("/", authorizeRoles("admin"), async (req, res) => {
  const { name, email, role, category, contact } = req.body;

  try {
    const username = generateUsername(name);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newLabor = new Labor({
      name,
      email,
      username,
      password: hashedPassword,
      role,
      category,
      contact,
      sites: [],
      attendanceRecords: [],
    });

    await newLabor.save();

    await transporter.sendMail({
      from: `"BuildTrack Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your BuildTrack Account Credentials",
      html: `
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your BuildTrack account has been created.</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${plainPassword}</p>
        <p>You can now log in to your BuildTrack account.</p>
        <p>Best regards,<br/>BuildTrack Admin Team</p>
      `,
    });

    res.status(201).json(newLabor);
  } catch (err) {
    console.error("Error creating labor:", err);
    res.status(400).json({ message: err.message });
  }
});

// --- PATCH worker site assignment (already used by SitesTasks) ---
router.patch("/:id", async (req, res) => {
  const laborId = req.params.id;
  const { site } = req.body;

  try {
    const labor = await Labor.findById(laborId);
    if (!labor) {
      return res.status(404).json({ message: "Labor not found." });
    }

    if (!site) {
      // release from all sites
      labor.sites = [];
    } else {
      labor.sites = [site];
    }

    await labor.save();
    res.json(labor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- PATCH manager-site assign/deassign (admin) ---
router.patch(
  "/manager-site/:id",
  authorizeRoles("admin"),
  async (req, res) => {
    const laborId = req.params.id;
    const { siteName, action } = req.body;

    try {
      const labor = await Labor.findById(laborId);
      if (!labor) return res.status(404).json({ message: "Labor not found." });

      if (action === "assign") {
        if (!labor.sites.includes(siteName)) labor.sites.push(siteName);
      } else if (action === "deassign") {
        labor.sites = labor.sites.filter((s) => s !== siteName);
      }

      await labor.save();
      res.json(labor);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// --- DELETE labor (ADMIN ONLY) ---
router.delete("/:id", authorizeRoles("admin"), async (req, res) => {
  try {
    const labor = await Labor.findById(req.params.id);
    if (!labor) return res.status(404).json({ message: "Labor not found." });

    await Labor.findByIdAndDelete(req.params.id);
    res.json({ message: "Labor deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================================================
// ATTENDANCE: RECORD + 3-MONTH SUMMARY
// =====================================================

// POST /labors/:id/attendance  -> mark attendance + hours
router.post(
  "/:id/attendance",
  authorizeRoles("admin", "Manager"),
  async (req, res) => {
    const laborId = req.params.id;
    const { siteName, date, hoursWorked } = req.body;

    if (!siteName || !date || typeof hoursWorked !== "number") {
      return res
        .status(400)
        .json({ message: "siteName, date, and hoursWorked are required." });
    }

    try {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      // load labor
      const labor = await Labor.findById(laborId);
      if (!labor) return res.status(404).json({ message: "Labor not found." });

      // cleanup > 3 months
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 3);
      labor.attendanceRecords = (labor.attendanceRecords || []).filter(
        (r) => r.date >= cutoff
      );

      // avoid duplicate entry for same day+site
      const existsSameDay = labor.attendanceRecords.some((r) => {
        const rd = new Date(r.date);
        rd.setHours(0, 0, 0, 0);
        return rd.getTime() === d.getTime() && r.siteName === siteName;
      });

      if (existsSameDay) {
        return res
          .status(400)
          .json({ message: "Attendance already recorded for today." });
      }

      labor.attendanceRecords.push({ siteName, date: d, hoursWorked });
      await labor.save();

      res.status(201).json(labor);
    } catch (err) {
      console.error("Error adding attendance:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

// GET /labors/:id/attendance-summary?months=3
router.get(
  "/:id/attendance-summary",
  authorizeRoles("admin", "Manager"),
  async (req, res) => {
    const laborId = req.params.id;
    const months = parseInt(req.query.months, 10) || 3;

    try {
      const labor = await Labor.findById(laborId).select("attendanceRecords");
      if (!labor) return res.status(404).json({ message: "Labor not found." });

      const now = new Date();
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);

      // keep only last `months` worth
      const records = (labor.attendanceRecords || []).filter(
        (r) => r.date >= cutoff
      );

      if (records.length !== (labor.attendanceRecords || []).length) {
        labor.attendanceRecords = records;
        await labor.save();
      }

      // compute per-month totals
      const summaryMap = {};
      records.forEach((rec) => {
        const dt = new Date(rec.date);
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!summaryMap[key]) {
          summaryMap[key] = { year: dt.getFullYear(), month: dt.getMonth(), hours: 0 };
        }
        summaryMap[key].hours += rec.hoursWorked;
      });

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const ordered = Object.values(summaryMap).sort((a, b) => {
        if (a.year === b.year) return b.month - a.month;
        return b.year - a.year;
      });

      const summary = ordered.slice(0, months).map((item) => ({
        label: `${monthNames[item.month]} ${item.year}`,
        hours: item.hours,
      }));

      // today lock flag
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hasTodayRecord = records.some((r) => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      res.json({ summary, hasTodayRecord });
    } catch (err) {
      console.error("Error building attendance summary:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
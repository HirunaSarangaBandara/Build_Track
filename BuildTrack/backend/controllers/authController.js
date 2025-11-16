const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // existing system users
const Labor = require("../models/Labor"); // new workers & managers

// Predefined Admin Credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// --- LOGIN USER ---
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1️⃣ Check predefined admin credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      return res.json({
        token,
        role: "admin",
        username: ADMIN_USERNAME,
        message: "Admin login successful",
      });
    }

    // 2️⃣ Check in regular User collection
    let user = await User.findOne({ username });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid password" });

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.json({
        token,
        role: user.role,
        username: user.username,
        message: "User login successful",
      });
    }

    // 3️⃣ Check in Labor collection (Managers / Workers added by Admin)
    const labor = await Labor.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!labor) return res.status(400).json({ message: "User not found" });

    const isPasswordMatch = await bcrypt.compare(password, labor.password);
    if (!isPasswordMatch)
      return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: labor._id, role: labor.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
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
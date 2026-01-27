const express = require("express");
const { loginUser } = require("../controllers/authController");
const router = express.Router();

// Login route
router.post("/login", loginUser);

module.exports = router;
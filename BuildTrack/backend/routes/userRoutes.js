const express = require("express");
const { createUser } = require("../controllers/userController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// Only admin can create users
router.post("/create", verifyToken, authorizeRoles("admin"), createUser);

module.exports = router;
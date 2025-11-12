const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");

exports.createUser = async (req, res) => {
  const { name, role } = req.body;

  if (!["manager", "worker"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const username = `${role}_${name.toLowerCase().replace(/\s/g, "")}_${Math.floor(
    Math.random() * 1000
  )}`;
  const passwordPlain = crypto.randomBytes(4).toString("hex");
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const newUser = new User({ name, username, password: passwordHash, role });
  await newUser.save();

  res.json({
    message: "User created successfully",
    username,
    password: passwordPlain,
  });
};
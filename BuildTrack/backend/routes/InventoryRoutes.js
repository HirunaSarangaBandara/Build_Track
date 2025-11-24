const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory"); 
// Import authorizeRoles from your middleware file
const { authorizeRoles } = require('../middleware/authMiddleware'); 

// --- GET All Inventory Items (Everyone can view) ---
router.get("/", async (req, res) => {
  try {
    const items = await Inventory.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- POST Add New Inventory Item (ADMIN ONLY) ---
router.post("/", authorizeRoles('admin'), async (req, res) => {
  const { name, category, quantity, unit } = req.body;

  try {
    const newItem = new Inventory({ name, category, quantity, unit });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    if (err.code === 11000) {
        return res.status(400).json({ message: "Inventory item name must be unique." });
    }
    res.status(400).json({ message: err.message });
  }
});

// --- PATCH Update Item Quantity/Availability (ADMIN ONLY) ---
router.patch("/:id", authorizeRoles('admin'), async (req, res) => {
  const updates = { quantity: req.body.quantity };

  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (item == null) {
      return res.status(404).json({ message: "Cannot find inventory item" });
    }

    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- DELETE Inventory Item (ADMIN ONLY) ---
router.delete("/:id", authorizeRoles('admin'), async (req, res) => {
    try {
        const item = await Inventory.findByIdAndDelete(req.params.id);

        if (item == null) {
            return res.status(404).json({ message: "Cannot find inventory item" });
        }

        res.json({ message: "Inventory item deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
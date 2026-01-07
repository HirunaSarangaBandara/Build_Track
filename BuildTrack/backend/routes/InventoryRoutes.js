const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const Site = require("../models/Site");
const { authorizeRoles } = require("../middleware/authMiddleware");

// --- GET All Inventory Items (Everyone can view) ---
router.get("/", async (req, res) => {
  try {
    const items = await Inventory.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- GET Inventory Items with allocation summary (Everyone can view) ---
router.get("/with-allocation", async (req, res) => {
  try {
    const sites = await Site.find().select("allocatedInventory");

    const allocationsMap = {};
    sites.forEach((site) => {
      (site.allocatedInventory || []).forEach((a) => {
        const key = a.inventoryItem.toString();
        if (!allocationsMap[key]) {
          allocationsMap[key] = { totalAllocated: 0, totalUsed: 0 };
        }
        allocationsMap[key].totalAllocated += a.allocatedQuantity;
        allocationsMap[key].totalUsed += a.usedQuantity;
      });
    });

    const items = await Inventory.find().sort({ category: 1, name: 1 });

    const enriched = items.map((item) => {
      const stats = allocationsMap[item._id.toString()] || {
        totalAllocated: 0,
        totalUsed: 0,
      };
      return {
        ...item.toObject(),
        totalAllocated: stats.totalAllocated,
        totalUsed: stats.totalUsed,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- POST Add New Inventory Item (ADMIN ONLY) ---
router.post("/", authorizeRoles("admin"), async (req, res) => {
  const { name, category, quantity, unit } = req.body;

  try {
    const newItem = new Inventory({ name, category, quantity, unit });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Inventory item name must be unique." });
    }
    res.status(400).json({ message: err.message });
  }
});

// --- PATCH Update Item Quantity/Availability (ADMIN ONLY) ---
router.patch("/:id", authorizeRoles("admin"), async (req, res) => {
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
router.delete("/:id", authorizeRoles("admin"), async (req, res) => {
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

// --- POST Allocate Inventory to Site (ADMIN ONLY) ---
router.post("/allocate", authorizeRoles("admin"), async (req, res) => {
  const { siteId, inventoryId, quantity } = req.body;

  if (!siteId || !inventoryId || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "siteId, inventoryId and positive quantity are required." });
  }

  try {
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found." });
    }

    const inventoryItem = await Inventory.findById(inventoryId);
    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    if (quantity > inventoryItem.quantity) {
      return res.status(400).json({
        message: "Allocation exceeds available inventory.",
        available: inventoryItem.quantity,
      });
    }

    if (!Array.isArray(site.allocatedInventory)) {
      site.allocatedInventory = [];
    }

    const existingAlloc = site.allocatedInventory.find(
      (a) => a.inventoryItem.toString() === inventoryId.toString()
    );

    if (existingAlloc) {
      existingAlloc.allocatedQuantity += quantity;
    } else {
      site.allocatedInventory.push({
        inventoryItem: inventoryItem._id,
        itemName: inventoryItem.name,
        unit: inventoryItem.unit,
        allocatedQuantity: quantity,
        usedQuantity: 0,
      });
    }

    inventoryItem.quantity -= quantity;

    await site.save();
    await inventoryItem.save();

    res.json({
      message: "Inventory allocated to site successfully.",
      site,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
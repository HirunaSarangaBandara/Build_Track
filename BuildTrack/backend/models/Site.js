const mongoose = require("mongoose");

// Task schema
const taskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
});

// Status update comment schema
const updateCommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Labor", required: true },
  userName: { type: String, required: true },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

// NEW: allocated inventory schema
const allocatedInventorySchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  itemName: { type: String, required: true },
  unit: { type: String, required: true },
  allocatedQuantity: { type: Number, required: true, min: 0 },
  usedQuantity: { type: Number, required: true, min: 0, default: 0 },
});

const siteSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  siteNameKey: {
    type: String,
    required: true,
    unique: true,
    default: function () {
      return this.siteName;
    },
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Labor",
    default: null,
  },
  managerName: {
    type: String,
    default: null,
  },
  siteImage: {
    type: String,
    default: null,
    set: function (v) {
      if (!v) return null;
      let normalized = v.replace(/\\/g, "/");
      return normalized.startsWith("/") ? normalized : "/" + normalized;
    },
  },
  startDate: {
    type: Date,
    default: Date.now,
  },

  tasks: [taskSchema],
  currentStatus: {
    type: String,
    default: "Site Created",
  },
  updates: [updateCommentSchema],

  status: {
    type: String,
    enum: ["Planned", "Active", "On Hold", "Completed"],
    default: "Active",
  },
  otherDetails: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // NEW: per-site inventory allocations
  allocatedInventory: [allocatedInventorySchema],
});

module.exports = mongoose.model("Site", siteSchema);
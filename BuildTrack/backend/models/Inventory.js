const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Cement & Aggregates",
      "Steel & Metal",
      "Wood & Timber",
      "Plumbing",
      "Electrical",
      "Tools & Equipment",
      "Safety Gear",
      "Finishing Materials",
      "Other",
    ],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
    default: "units",
  },
  availability: {
    type: String,
    required: true,
    enum: ["In Stock", "Low Stock", "Out of Stock"],
    default: "In Stock",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to automatically update availability based on quantity thresholds
inventorySchema.pre('save', function (next) {
  if (this.isModified('quantity')) {
    if (this.quantity > 50) {
      this.availability = "In Stock";
    } else if (this.quantity > 0 && this.quantity <= 50) {
      this.availability = "Low Stock";
    } else {
      this.availability = "Out of Stock";
    }
  }
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("Inventory", inventorySchema);
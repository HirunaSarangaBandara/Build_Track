const mongoose = require("mongoose");

function calculateAvailability(quantity) {
  if (quantity > 50) {
    return "In Stock";
  } else if (quantity > 0 && quantity <= 50) {
    return "Low Stock";
  } else {
    return "Out of Stock";
  }
}

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

// Set availability + lastUpdated before save
inventorySchema.pre("save", function (next) {
  if (this.isModified("quantity") || this.isNew) {
    this.availability = calculateAvailability(this.quantity);
  }
  this.lastUpdated = Date.now();
  next();
});

// Keep availability + lastUpdated in sync on updates
inventorySchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  const update = this.getUpdate();

  if (update.quantity !== undefined && update.quantity !== null) {
    update.availability = calculateAvailability(update.quantity);
    update.lastUpdated = Date.now();
  } else if (update.$set && update.$set.quantity !== undefined) {
    update.$set.availability = calculateAvailability(update.$set.quantity);
    update.$set.lastUpdated = Date.now();
  }

  if (!update.lastUpdated && !(update.$set && update.$set.lastUpdated)) {
    this.set({ lastUpdated: Date.now() });
  }

  next();
});

module.exports = mongoose.model("Inventory", inventorySchema);
const mongoose = require("mongoose");

// Define the schema for a single task/step
const taskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
});

// Define the schema for status update comments
const updateCommentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Labor', required: true },
    userName: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

// --- NEW: Allocated Inventory Schema ---
// This handles the tracking of materials assigned to this specific site
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
    siteNameKey: { // Used for clean lookup of assigned workers
        type: String,
        required: true,
        unique: true,
        default: function() { return this.siteName; }
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Labor',
        default: null, // Allow unassigned sites
    },
    managerName: {
        type: String,
        default: null, // Allow unassigned managers
    },
    siteImage: {
        type: String, // Path saved by Multer
        default: null,
        // (Optional) improved path handling from your first file
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
        enum: ['Planned', 'Active', 'On Hold', 'Completed'],
        default: 'Active',
    },
    
    otherDetails: {
        type: String,
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },

    // --- NEW: Link the inventory schema here ---
    allocatedInventory: [allocatedInventorySchema],
});

module.exports = mongoose.model('Site', siteSchema);
// models/Site.js

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
});

module.exports = mongoose.model('Site', siteSchema);
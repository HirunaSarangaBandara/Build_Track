const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    siteName: { type: String, required: true },
    date: { type: Date, required: true },
    hoursWorked: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const laborSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },

  username: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  role: { type: String, enum: ["Manager", "Worker", "admin"], required: true },

  category: {
    type: String,
    enum: [
      "",
      "Mason",
      "Plumber",
      "Electrician",
      "Carpenter",
      "Painter",
      "Welder",
      "Steel Fixer",
      "Supervisor",
      "Helper",
    ],
    default: "",
  },

  contact: { type: String, required: true },

  // list of site names the user is currently assigned to
  sites: {
    type: [String],
    default: [],
  },

  // embedded attendance records – rolled and cleaned via routes
  attendanceRecords: {
    type: [attendanceSchema],
    default: [],
  },

  createdAt: { type: Date, default: Date.now },
});

// Static helper (optional, used in route)
laborSchema.statics.addAttendance = async function ({
  laborId,
  siteName,
  date,
  hoursWorked,
}) {
  const Labor = this;
  const labor = await Labor.findById(laborId);
  if (!labor) throw new Error("Labor not found");

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);

  // Remove anything older than 3 months
  labor.attendanceRecords = labor.attendanceRecords.filter(
    (rec) => rec.date >= cutoff
  );

  labor.attendanceRecords.push({ siteName, date, hoursWorked });
  await labor.save();
  return labor;
};

module.exports = mongoose.model("Labor", laborSchema);
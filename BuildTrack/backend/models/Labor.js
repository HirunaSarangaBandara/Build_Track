const mongoose = require("mongoose");

const laborSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Manager", "Worker"], required: true },
    category: {
        type: String,
        enum: [
            "", "Mason", "Plumber", "Electrician", "Carpenter", "Painter", 
            "Welder", "Steel Fixer", "Supervisor", "Helper",
        ],
        default: "",
    },
    contact: { type: String, required: true },
    
    // Enforces one user per site, but allows multiple unassigned users
    site: { 
        type: String,
        unique: true, 
        sparse: true  
    }, 
    
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Labor", laborSchema);
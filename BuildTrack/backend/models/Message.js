const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, required: true },
    content: { type: String },
    fileUrl: { type: String }, 
    fileType: { type: String }, // 'image' or 'pdf'
    fileName: { type: String }, 
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 2592000 } 
});

module.exports = mongoose.model("Message", messageSchema);
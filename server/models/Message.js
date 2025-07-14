const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    from: { type: String, required: true }, // sender's email
    to: { type: String, required: true },   // receiver's email
    content: { type: String, required: true }, // encrypted message
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);

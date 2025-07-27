const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    contentForReceiver: { type: String, required: true },
    contentForSender: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);

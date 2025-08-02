const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    encryptedMessage: { type: String, required: true },
    aesKeyForReceiver: { type: String, required: true },
    aesKeyForSender: { type: String, required: true },
    iv: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
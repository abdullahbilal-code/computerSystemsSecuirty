const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Message = require('../models/Message');
const User = require('../models/User');

// Encrypt with RSA public key
function encryptWithPublicKey(publicKey, message) {
    return crypto.publicEncrypt(publicKey, Buffer.from(message)).toString('base64');
}

// Send Message Route
router.post('/send', async (req, res) => {
    try {
        const { from, to, message } = req.body;
        const normalizedFrom = from.trim().toLowerCase();
        const normalizedTo = to.trim().toLowerCase();

        const receiver = await User.findOne({ email: normalizedTo });
        if (!receiver) return res.status(404).json({ msg: 'Recipient not found' });

        // Encrypt the message with receiver's public key
        const encryptedMessage = encryptWithPublicKey(receiver.publicKey, message);

        const newMessage = new Message({ 
            from: normalizedFrom, 
            to: normalizedTo, 
            content: encryptedMessage 
        });
        await newMessage.save();

        res.status(200).json({ msg: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Inbox Messages
router.get('/inbox/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const normalizedEmail = email.trim().toLowerCase();
        const messages = await Message.find({ to: normalizedEmail }).sort({ timestamp: -1 });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

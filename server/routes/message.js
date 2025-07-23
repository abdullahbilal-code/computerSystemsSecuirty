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
        const receiver = await User.findOne({ email: to });
        const newMessage = new Message({ from, to, content: message });
        if (!receiver) return res.status(404).json({ msg: 'Recipient not found' });
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
        const messages = await Message.find({ to: email }).sort({ timestamp: -1 });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

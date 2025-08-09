const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

// Send Message Route
router.post('/send', requireAuth, async (req, res) => {
    try {
        const {
            to,
            encryptedMessage,
            aesKeyForReceiver,
            aesKeyForSender,
            iv
        } = req.body;

        if (!to || !encryptedMessage || !aesKeyForReceiver || !aesKeyForSender || !iv) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        const receiver = await User.findOne({ email: to.toLowerCase() });
        if (!receiver) return res.status(404).json({ msg: 'Recipient not found' });

        // Enforce "from" = authenticated user
        const from = req.user.email.toLowerCase();

        const newMessage = new Message({
            from,
            to: to.toLowerCase(),
            encryptedMessage,
            aesKeyForReceiver,
            aesKeyForSender,
            iv
        });

        await newMessage.save();
        res.status(200).json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Inbox Messages
router.get('/inbox/:email', requireAuth, async (req, res) => {
    try {
        // Only allow fetching your own inbox
        if (req.params.email.toLowerCase() !== req.user.email.toLowerCase()) {
            return res.status(403).json({ msg: 'Forbidden' });
        }

        const email = req.params.email.toLowerCase();
        const messages = await Message.find({
            $or: [{ to: email }, { from: email }]
        }).sort({ timestamp: -1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

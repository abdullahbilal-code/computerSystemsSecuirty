const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// Send Message Route
router.post('/send', async (req, res) => {
    try {
        const { from, to, contentForReceiver, contentForSender } = req.body;

        if (!contentForReceiver || !contentForSender) {
            return res.status(400).json({ msg: 'Both encrypted contents are required' });
        }

        const receiver = await User.findOne({ email: to.toLowerCase() });
        if (!receiver) {
            return res.status(404).json({ msg: 'Recipient not found' });
        }
        const newMessage = new Message({
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            contentForReceiver,
            contentForSender
        });
        await newMessage.save();

        res.status(200).json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Inbox Messages
router.get('/inbox/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const messages = await Message.find({
            $or: [
                { to: email.toLowerCase() },
                { from: email.toLowerCase() }
            ]
        }).sort({ timestamp: -1 });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

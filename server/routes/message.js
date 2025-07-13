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
        if (!receiver) return res.status(404).json({ msg: 'Recipient not found' });

        const encryptedMsg = encryptWithPublicKey(receiver.publicKey, message);

        const newMessage = new Message({ from, to, content: encryptedMsg });
        await newMessage.save();

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;

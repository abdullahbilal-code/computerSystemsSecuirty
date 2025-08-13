// routes/message.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const Message = require('../models/Message');
const User = require('../models/User');
const Pair = require('../models/Pairs');

// util to check pair
function sortPairEmails(e1, e2) {
    const a = e1.toLowerCase();
    const b = e2.toLowerCase();
    return a < b ? [a, b] : [b, a];
}

// Verify ECDSA P-256 using WebCrypto in Node >= v19 (or use node:crypto subtle)
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
const b64ToU8 = b64 => Uint8Array.from(Buffer.from(b64, 'base64'));

async function importEcdsaSpki(b64) {
    return await subtle.importKey(
        'spki',
        b64ToU8(b64),
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
    );
}

router.post('/send', requireAuth, async (req, res) => {
    try {
        const from = req.user.email.toLowerCase();
        const {
            to,
            encryptedMessage,
            aesKeyForReceiver,
            aesKeyForSender,
            iv,
            signature
        } = req.body;

        if (!to || !encryptedMessage || !aesKeyForReceiver || !aesKeyForSender || !iv || !signature) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        const [a, b] = sortPairEmails(from, to);
        const pair = await Pair.findOne({ a, b });
        if (!pair || !pair.verified) {
            return res.status(403).json({ msg: 'Pair not verified. Request/verify OTP first.' });
        }

        const sender = await User.findOne({ email: from });
        if (!sender || !sender.signingPublicKey) {
            return res.status(400).json({ msg: 'Sender has no signing key on record' });
        }
        const spki = await importEcdsaSpki(sender.signingPublicKey);

        const enc = new TextEncoder();
        const toBytes = enc.encode(to.toLowerCase());
        const ivBytes = b64ToU8(iv);
        const msgBytes = b64ToU8(encryptedMessage);
        const payload = new Uint8Array(toBytes.length + ivBytes.length + msgBytes.length);
        payload.set(toBytes, 0);
        payload.set(ivBytes, toBytes.length);
        payload.set(msgBytes, toBytes.length + ivBytes.length);

        const ok = await subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            spki,
            b64ToU8(signature),
            payload
        );
        if (!ok) return res.status(400).json({ msg: 'Invalid signature' });

        const newMessage = new Message({
            from,
            to: to.toLowerCase(),
            encryptedMessage,
            aesKeyForReceiver,
            aesKeyForSender,
            iv,
            signature
        });
        await newMessage.save();
        res.status(200).json({ msg: 'Message sent successfully' });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/inbox/:email', requireAuth, async (req, res) => {
    try {
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

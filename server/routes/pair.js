const express = require('express');
const bcrypt = require('bcrypt');
const requireAuth = require('../middleware/requireAuth');
const Pair = require('../models/Pairs');

const router = express.Router();

function sortPairEmails(e1, e2) {
    const a = e1.toLowerCase();
    const b = e2.toLowerCase();
    return a < b ? [a, b] : [b, a];
}

// Request OTP for a pair (first contact)
router.post('/request', requireAuth, async (req, res) => {
    try {
        const me = req.user.email.toLowerCase();
        const { to } = req.body;
        if (!to) return res.status(400).json({ msg: 'Missing "to"' });
        const [a, b] = sortPairEmails(me, to);

        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        const otpHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const existing = await Pair.findOneAndUpdate(
            { a, b },
            { verified: false, otpHash, expiresAt },
            { upsert: true, new: true }
        );

        // "Send" the OTP — for class demo we log it (pretend email)
        console.log(`OTP for pair ${a}<->${b}: ${code} (expires in 10 minutes)`);

        return res.json({ msg: 'OTP generated and sent (check server console in demo).' });
    } catch (e) {
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Verify OTP
router.post('/verify', requireAuth, async (req, res) => {
    try {
        const me = req.user.email.toLowerCase();
        const { withEmail, code } = req.body;
        if (!withEmail || !code) return res.status(400).json({ msg: 'Missing fields' });
        const [a, b] = sortPairEmails(me, withEmail);

        const pair = await Pair.findOne({ a, b });
        if (!pair || !pair.otpHash || !pair.expiresAt) {
            return res.status(400).json({ msg: 'No OTP requested' });
        }
        if (pair.expiresAt < new Date()) {
            return res.status(400).json({ msg: 'OTP expired' });
        }
        const ok = await bcrypt.compare(code, pair.otpHash);
        if (!ok) return res.status(400).json({ msg: 'Invalid code' });

        pair.verified = true;
        pair.otpHash = null;
        pair.expiresAt = null;
        await pair.save();

        return res.json({ msg: 'Pair verified' });
    } catch (e) {
        return res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;

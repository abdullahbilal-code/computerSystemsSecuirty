const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');

// Helper: Generate RSA key pair
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return { publicKey, privateKey };
}

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { email, password, publicKey } = req.body;

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ msg: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            publicKey,
            privateKey: "frontend-only", // optional placeholder
        });

        await newUser.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        res.status(200).json({ msg: 'Login successful', publicKey: user.publicKey });

    } catch (err) {
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
});

// GET /api/auth/user/:email
router.get('/user/:email', async (req, res) => {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ publicKey: user.publicKey });
});


module.exports = router;

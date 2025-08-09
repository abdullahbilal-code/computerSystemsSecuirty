const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../helper/makeToken');


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
            privateKey: "frontend-only",
        });

        await newUser.save();
        const token = signToken(newUser);
        res.status(201).json({
            msg: 'User registered successfully',
            token,
            email: newUser.email,
            publicKey: newUser.publicKey
        });
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

        const token = signToken(user);
        res.status(200).json({
            msg: 'Login successful',
            token,
            email: user.email,
            publicKey: user.publicKey
        });

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

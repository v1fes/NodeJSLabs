const express = require('express');
const User = require('../models/user');
const auth = require('../middleware/auth');
const router = new express.Router();

// User Registration
router.post('/users', async (req, res) => {
    console.log('--- POST /users HITTED! ---', req.body);
    const user = new User(req.body);
    try {
        await user.save();
        console.log('--- user saved ---');
        const token = await user.generateAuthToken();
        res.status(201).send({ user, token });
    } catch (e) {
        console.error('Registration Error', e);
        res.status(400).send({ error: e.message || 'unknown error' });
    }
});

// User Login
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findOneByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({ user, token });
    } catch (e) {
        res.status(400).send();
    }
});

// User Logout
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();
        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

// User Logout All
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.send();
    } catch (e) {
        res.status(500).send();
    }
});

// Get User Profile
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

// Get User by ID
router.get('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.send(user);
    } catch (e) {
        res.status(500).send();
    }
});

// Update User
router.patch('/users/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send();
        }

        updates.forEach((update) => user[update] = req.body[update]);
        await user.save(); // Utilizing .save() over findByIdAndUpdate() for middleware execution (password hashing)
        
        res.send(user);
    } catch (e) {
        res.status(400).send(e);
    }
});

// Delete User
router.delete('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).send();
        }
        res.send(user);
    } catch (e) {
        res.status(500).send(e);
    }
});

module.exports = router;
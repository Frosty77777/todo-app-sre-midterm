const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

// Verify JWT token
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        const user = await UserModel.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        if (typeof next === 'function') {
            next();
        }
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Check if user is admin
const authorizeAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'admin') {
        if (typeof next === 'function') {
            next();
        }
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { authenticate, authorizeAdmin };

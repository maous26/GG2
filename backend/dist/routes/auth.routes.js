"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const errorHandler_middleware_1 = require("../middleware/errorHandler.middleware");
const logger_1 = require("../config/logger");
const request_ip_1 = __importDefault(require("request-ip"));
const router = express_1.default.Router();
// Newsletter signup (from landing page)
router.post('/newsletter', (0, validation_middleware_1.validate)({
    body: validation_middleware_1.schemas.register.body.fork(['email'], (schema) => schema.required())
        .fork(['password', 'firstName', 'lastName'], (schema) => schema.forbidden())
}), (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const clientIp = request_ip_1.default.getClientIp(req);
    // Check if user already exists
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        return res.json({
            message: 'Already subscribed! You\'ll receive our best deals.',
            alreadyExists: true
        });
    }
    // Create user with temporary password (they can set it later if they upgrade)
    const tempPassword = Math.random().toString(36).slice(-10);
    const salt = await bcrypt_1.default.genSalt(10);
    const hashedPassword = await bcrypt_1.default.hash(tempPassword, salt);
    const user = new User_1.default({
        email,
        password: hashedPassword,
        subscription_type: 'free'
    });
    await user.save();
    logger_1.logger.info('Newsletter signup', { email, ip: clientIp });
    res.status(201).json({
        message: 'Successfully subscribed! You\'ll start receiving flight deals soon.',
        user: {
            id: user._id,
            email: user.email,
            subscription_type: user.subscription_type
        }
    });
}));
// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, subscription_type = 'free' } = req.body;
        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({
                message: 'Email, nom et mot de passe sont requis'
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Format d\'email invalide'
            });
        }
        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({
                message: 'Le mot de passe doit contenir au moins 8 caractères'
            });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: 'Le mot de passe doit contenir au moins une majuscule'
            });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: 'Le mot de passe doit contenir au moins un chiffre'
            });
        }
        // Check if user exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        // Create user
        const user = new User_1.default({
            email,
            name,
            password: hashedPassword,
            subscription_type
        });
        await user.save();
        // Create token
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-jwt-secret-key', { expiresIn: '24h' });
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                subscription_type: user.subscription_type
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email et mot de passe sont requis'
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Format d\'email invalide'
            });
        }
        // 🔍 DEBUG: Log incoming request
        console.log('🔍 LOGIN REQUEST DEBUG:');
        console.log('📧 Email:', email);
        console.log('🔑 Password length:', password ? password.length : 'undefined');
        console.log('📦 Full body:', req.body);
        console.log('🌐 Headers:', req.headers);
        // Check if user exists
        const user = await User_1.default.findOne({ email });
        console.log('👤 User found:', user ? 'YES' : 'NO');
        if (!user) {
            console.log('❌ User not found for email:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // Check password
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        console.log('🔐 Password check result:', validPassword);
        if (!validPassword) {
            console.log('❌ Invalid password for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log('✅ Login successful for user:', email);
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Create token
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'your-jwt-secret-key', { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                subscription_type: user.subscription_type
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});
// Update user preferences
router.put('/users/preferences', async (req, res) => {
    try {
        const { userId, preferences, onboardingCompleted } = req.body;
        const user = await User_1.default.findByIdAndUpdate(userId, {
            preferences,
            onboardingCompleted,
            onboardingDate: onboardingCompleted ? new Date() : undefined,
            profileCompleteness: calculateProfileCompleteness(preferences)
        }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            message: 'Preferences updated successfully',
            user: {
                id: user._id,
                email: user.email,
                subscription_type: user.subscription_type,
                preferences: user.preferences,
                onboardingCompleted: user.onboardingCompleted,
                profileCompleteness: user.profileCompleteness
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating preferences', error });
    }
});
// Helper function to calculate profile completeness
function calculateProfileCompleteness(preferences) {
    let score = 0;
    const maxScore = 6;
    if (preferences?.travelerType)
        score += 1;
    if (preferences?.dreamDestinations?.length > 0)
        score += 1;
    if (preferences?.travelPeriod?.flexible !== undefined)
        score += 1;
    if (preferences?.notificationStyle)
        score += 1;
    if (preferences?.budgetRange?.min && preferences?.budgetRange?.max)
        score += 1;
    if (preferences?.additionalAirports)
        score += 1; // Even if empty, it's considered
    return Math.round((score / maxScore) * 100);
}
exports.default = router;

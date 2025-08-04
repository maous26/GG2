"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
exports.authenticateToken = authenticateToken;
const isAdmin = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user.userId);
        // Add your admin emails here
        const adminEmails = ['admin@globegenius.app'];
        if (!user || !adminEmails.includes(user.email)) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ error: 'Authorization check failed' });
    }
};
exports.isAdmin = isAdmin;

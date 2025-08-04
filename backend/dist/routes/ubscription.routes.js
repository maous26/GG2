"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ===== backend/src/routes/subscription.routes.ts =====
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// Get subscription status
router.get('/status', async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            subscription_type: user.subscription_type
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching subscription status', error });
    }
});
// Update subscription
router.post('/update', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { subscription_type } = req.body;
        const user = await User_1.default.findByIdAndUpdate(userId, { subscription_type }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            subscription_type: user.subscription_type
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating subscription', error });
    }
});
exports.default = router;

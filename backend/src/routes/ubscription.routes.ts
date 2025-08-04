// ===== backend/src/routes/subscription.routes.ts =====
import express, { Request } from 'express';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = express.Router();

// Get subscription status
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      subscription_type: user.subscription_type
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription status', error });
  }
});

// Update subscription
router.post('/update', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { subscription_type } = req.body;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { subscription_type },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      subscription_type: user.subscription_type
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subscription', error });
  }
});

export default router;
import express, { Request, Response } from 'express';
import User from '../models/User';
import Alert from '../models/Alert';
import Route from '../models/Route';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Interface pour les requêtes authentifiées
interface AuthRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any;
  };
}

// Middleware d'authentification pour toutes les routes utilisateur
router.use(authenticateToken);

// GET /api/users/stats - Statistiques utilisateur
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Compter les alertes envoyées à cet utilisateur
    const alertsCount = await Alert.countDocuments({
      'sentTo.user': userId
    });
    
    // Récupérer les alertes pour calculer les économies
    const alerts = await Alert.find({
      'sentTo.user': userId
    });
    
    // Calculer les économies potentielles basées sur les prix et réductions
    const totalSavings = alerts.reduce((sum, alert) => {
      const originalPrice = alert.price / (1 - alert.discountPercentage / 100);
      const savings = originalPrice - alert.price;
      return sum + Math.round(savings);
    }, 0);

    // Calculer le nombre de routes réellement surveillées
    const additionalAirports = user.preferences?.additionalAirports?.length || 0;
    
    // Aéroports de départ : CDG, ORY, BVA (par défaut) + aéroports province choisis
    const defaultAirports = 3; // CDG, ORY, BVA
    const totalDepartureAirports = defaultAirports + additionalAirports;
    
    // Obtenir le nombre réel de destinations uniques surveillées dans notre système
    const uniqueDestinations = await Route.distinct('destination', { isActive: true });
    const totalDestinations = uniqueDestinations.length;
    
    // Routes actives = Aéroports de départ × Toutes les destinations surveillées
    const totalWatchedRoutes = totalDepartureAirports * totalDestinations;

    const stats = {
      alertsReceived: alertsCount,
      totalSavings: Math.max(totalSavings, 0),
      watchedDestinations: totalWatchedRoutes,
      profileCompleteness: user.profileCompleteness || 0,
      subscription: {
        type: user.subscription_type,
        isActive: user.subscription_type === 'premium' || user.subscription_type === 'enterprise',
        since: user.createdAt
      },
      preferences: {
        travelerType: user.preferences?.travelerType,
        notificationStyle: user.preferences?.notificationStyle,
        additionalAirports: user.preferences?.additionalAirports,
        dreamDestinations: user.preferences?.dreamDestinations,
        budgetRange: user.preferences?.budgetRange
      },
      routeBreakdown: {
        departureAirports: {
          default: ['CDG', 'ORY', 'BVA'],
          additional: user.preferences?.additionalAirports || [],
          total: totalDepartureAirports
        },
        destinations: {
          total: totalDestinations,
          surveilledInSystem: uniqueDestinations.slice(0, 10), // Première 10 pour exemple
          dreamDestinations: user.preferences?.dreamDestinations?.length || 0
        },
        totalRoutes: totalWatchedRoutes,
        explanation: `${totalDepartureAirports} aéroports × ${totalDestinations} destinations = ${totalWatchedRoutes} routes surveillées`
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

// GET /api/users/profile - Profil utilisateur complet
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        subscription_type: user.subscription_type,
        preferences: user.preferences,
        onboardingCompleted: user.onboardingCompleted,
        profileCompleteness: user.profileCompleteness,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

// PUT /api/users/profile - Mise à jour profil utilisateur
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { preferences } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Calculer le profil completeness
    const calculateCompleteness = (prefs: any): number => {
      let score = 0;
      const maxScore = 6;

      if (prefs?.travelerType) score += 1;
      if (prefs?.dreamDestinations?.length > 0) score += 1;
      if (prefs?.travelPeriod?.flexible !== undefined) score += 1;
      if (prefs?.notificationStyle) score += 1;
      if (prefs?.budgetRange?.min && prefs?.budgetRange?.max) score += 1;
      if (prefs?.additionalAirports) score += 1;

      return Math.round((score / maxScore) * 100);
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        preferences,
        profileCompleteness: calculateCompleteness(preferences),
        onboardingCompleted: true,
        onboardingDate: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

export default router; 
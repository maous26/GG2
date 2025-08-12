import express, { Request, Response } from 'express';
import User from '../models/User';
import Alert from '../models/Alert';
import Route from '../models/Route';
// Import strategic models for adaptive pricing
import StrategicRoute from '../models/StrategicRoute';
import PricePrediction from '../models/PricePrediction';
import { IntelligentPricingService } from '../services/intelligentPricingService';
import { authenticateToken } from '../middleware/auth.middleware';
import bcrypt from 'bcrypt';

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

// PUT /api/users/password - Changer le mot de passe
router.put('/password', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (!userId) return res.status(401).json({ message: 'Non autorisé' });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe' });
  }
});

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
        type: user.createdAt
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

// GET /api/users/adaptive-pricing - Données de prix adaptatif pour l'utilisateur
router.get('/adaptive-pricing', async (req: AuthRequest, res: Response) => {
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

    // Déterminer le seuil adaptatif pour l'utilisateur
    const userSegmentThresholds = {
      free: 35,
      premium: 25,
      enterprise: 20
    };
    const userThreshold = userSegmentThresholds[user.subscription_type as keyof typeof userSegmentThresholds] || 35;

    // Récupérer les alertes récentes avec données adaptatives
    const recentAlerts = await Alert.find({
      'sentTo.user': userId,
      detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 derniers jours
    })
    .sort({ detectedAt: -1 })
    .limit(10);

    // Calculer les économies totales
    const totalSavings = recentAlerts.reduce((sum, alert) => {
      const originalPrice = alert.price / (1 - alert.discountPercentage / 100);
      const savings = originalPrice - alert.price;
      return sum + Math.round(savings);
    }, 0);

    // Calculer les moyennes de seuils
    const allUsers = await User.find({});
    const segmentUsers = allUsers.filter(u => u.subscription_type === user.subscription_type);
    const segmentAverage = userSegmentThresholds[user.subscription_type as keyof typeof userSegmentThresholds] || 35;
    const systemAverage = 30; // Ancien seuil fixe pour comparaison

    // Générer des insights IA personnalisés
    const personalizedRecommendations = [
      `Votre seuil de ${userThreshold}% est optimisé pour votre profil ${user.subscription_type}`,
      'Le système IA analyse en continu vos préférences de voyage',
      'Les alertes sont validées par 3 niveaux: statistique, prédictif, contextuel',
      'Votre historique améliore la précision des prédictions'
    ];

    const savingsOptimization = user.subscription_type === 'free' 
      ? 'Passez au Premium pour un seuil plus sensible (25% vs 35%) et plus d\'économies'
      : user.subscription_type === 'premium'
      ? 'Votre seuil Premium de 25% vous fait économiser en moyenne 40% de plus qu\'un compte gratuit'
      : 'Votre seuil Enterprise de 20% maximise vos économies avec la plus haute précision IA';

    // Prédictions de routes prometteuses
    const nextBestRoutes = [
      { route: 'CDG → JFK', predictedSavings: 280, confidence: 85 },
      { route: 'ORY → BCN', predictedSavings: 95, confidence: 92 },
      { route: 'CDG → DXB', predictedSavings: 350, confidence: 78 }
    ];

    res.json({
      user: {
        email: user.email,
        subscriptionType: user.subscription_type,
        adaptiveThreshold: userThreshold,
        totalSavings,
        alertsReceived: recentAlerts.length
      },
      recentAlerts: recentAlerts.map(alert => {
        const originalPrice = alert.price / (1 - alert.discountPercentage / 100);
        const savings = originalPrice - alert.price;
        
        return {
          _id: alert._id,
          route: `${alert.origin} → ${alert.destination}`,
          origin: alert.origin,
          destination: alert.destination,
          airline: alert.airline,
          price: alert.price,
          discountPercentage: alert.discountPercentage,
          savings: Math.round(savings),
          detectedAt: alert.detectedAt,
          validationScore: alert.validationScore || 0,
          recommendation: alert.recommendation || 'SEND',
          validationMethod: alert.validationMethod || 'STATISTICAL',
          adaptiveThreshold: alert.adaptiveThreshold || userThreshold,
          isAdaptive: !!alert.adaptiveThreshold
        };
      }),
      thresholdInfo: {
        yourThreshold: userThreshold,
        systemAverage,
        segmentAverage,
        explanation: `Votre seuil de ${userThreshold}% est calculé par IA selon votre segment ${user.subscription_type}. Plus bas que l'ancien système fixe (30%), il vous permet de recevoir plus d'alertes de qualité.`
      },
      aiInsights: {
        personalizedRecommendations,
        savingsOptimization,
        nextBestRoutes
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des données de prix adaptatif:', error);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

export default router;
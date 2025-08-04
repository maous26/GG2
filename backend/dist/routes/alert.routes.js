"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ===== backend/src/routes/alert.routes.ts =====
const express_1 = __importDefault(require("express"));
const Alert_1 = __importDefault(require("../models/Alert"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// GET /api/alerts - Récupérer toutes les alertes (admin)
router.get('/', async (req, res) => {
    try {
        const alerts = await Alert_1.default.find()
            .populate('sentTo.user', 'email subscription_type')
            .sort({ detectedAt: -1 })
            .limit(50);
        res.json(alerts);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
// GET /api/alerts/user - Récupérer les alertes d'un utilisateur spécifique (nécessite auth)
router.get('/user', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        // Récupérer les alertes envoyées à cet utilisateur
        const alerts = await Alert_1.default.find({
            'sentTo.user': userId
        })
            .sort({ detectedAt: -1 })
            .limit(20);
        // Formater les alertes pour le frontend
        const formattedAlerts = alerts.map(alert => {
            const userAlert = alert.sentTo.find(sent => sent.user.toString() === userId);
            // Calculer les économies
            const originalPrice = alert.price / (1 - alert.discountPercentage / 100);
            const savings = Math.round(originalPrice - alert.price);
            return {
                _id: alert._id,
                route: `${alert.origin} → ${alert.destination}`,
                origin: alert.origin,
                destination: alert.destination,
                airline: alert.airline,
                price: alert.price,
                discountPercentage: alert.discountPercentage,
                savings: Math.max(savings, 0),
                detectedAt: alert.detectedAt,
                expiresAt: alert.expiresAt,
                sentAt: userAlert?.sentAt,
                opened: userAlert?.opened || false,
                clicked: userAlert?.clicked || false,
                description: `Vol ${alert.airline} avec ${alert.discountPercentage}% de réduction`
            };
        });
        res.json(formattedAlerts);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des alertes utilisateur:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
// POST /api/alerts - Créer une nouvelle alerte (admin)
router.post('/', async (req, res) => {
    try {
        const { origin, destination, airline, price, discountPercentage, expiresAt } = req.body;
        const alert = new Alert_1.default({
            origin,
            destination,
            airline,
            price,
            discountPercentage,
            expiresAt: new Date(expiresAt),
            sentTo: []
        });
        const savedAlert = await alert.save();
        res.status(201).json(savedAlert);
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'alerte:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
// PUT /api/alerts/:id/mark-opened - Marquer une alerte comme ouverte
router.put('/:id/mark-opened', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        const alert = await Alert_1.default.findById(id);
        if (!alert) {
            return res.status(404).json({ message: 'Alerte non trouvée' });
        }
        // Marquer comme ouverte pour cet utilisateur
        const userIndex = alert.sentTo.findIndex(sent => sent.user.toString() === userId);
        if (userIndex !== -1) {
            alert.sentTo[userIndex].opened = true;
            await alert.save();
        }
        res.json({ message: 'Alerte marquée comme ouverte' });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'alerte:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
// PUT /api/alerts/:id/mark-clicked - Marquer une alerte comme cliquée
router.put('/:id/mark-clicked', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        const alert = await Alert_1.default.findById(id);
        if (!alert) {
            return res.status(404).json({ message: 'Alerte non trouvée' });
        }
        // Marquer comme cliquée pour cet utilisateur
        const userIndex = alert.sentTo.findIndex(sent => sent.user.toString() === userId);
        if (userIndex !== -1) {
            alert.sentTo[userIndex].clicked = true;
            alert.sentTo[userIndex].opened = true; // Également marquer comme ouverte
            await alert.save();
        }
        res.json({ message: 'Alerte marquée comme cliquée' });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'alerte:', error);
        res.status(500).json({
            message: 'Erreur serveur',
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
    }
});
exports.default = router;

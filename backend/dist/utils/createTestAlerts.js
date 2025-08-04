"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestAlerts = createTestAlerts;
exports.cleanupOldAlerts = cleanupOldAlerts;
const Alert_1 = __importDefault(require("../models/Alert"));
const User_1 = __importDefault(require("../models/User"));
async function createTestAlerts() {
    try {
        console.log('🚀 Création d\'alertes de test...');
        // Trouver des utilisateurs premium pour leur envoyer des alertes
        const premiumUsers = await User_1.default.find({
            subscription_type: { $in: ['premium', 'enterprise'] }
        }).limit(5);
        if (premiumUsers.length === 0) {
            console.log('Aucun utilisateur premium trouvé pour créer des alertes');
            return;
        }
        // Définir des alertes de test
        const alertsData = [
            {
                origin: 'CDG',
                destination: 'JFK',
                airline: 'Air France',
                price: 299,
                discountPercentage: 65,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
            },
            {
                origin: 'ORY',
                destination: 'NRT',
                airline: 'ANA',
                price: 450,
                discountPercentage: 55,
                expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 jours
            },
            {
                origin: 'CDG',
                destination: 'LAX',
                airline: 'Delta',
                price: 320,
                discountPercentage: 70,
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 jours
            },
            {
                origin: 'BVA',
                destination: 'BCN',
                airline: 'Ryanair',
                price: 45,
                discountPercentage: 40,
                expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 jours
            },
            {
                origin: 'CDG',
                destination: 'DXB',
                airline: 'Emirates',
                price: 380,
                discountPercentage: 50,
                expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 jours
            },
            {
                origin: 'ORY',
                destination: 'MLE',
                airline: 'Air Austral',
                price: 650,
                discountPercentage: 45,
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 jours
            }
        ];
        let createdCount = 0;
        for (const alertData of alertsData) {
            // Vérifier si cette alerte existe déjà
            const existingAlert = await Alert_1.default.findOne({
                origin: alertData.origin,
                destination: alertData.destination,
                airline: alertData.airline,
                price: alertData.price
            });
            if (!existingAlert) {
                // Créer une nouvelle alerte
                const alert = new Alert_1.default({
                    ...alertData,
                    detectedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Créée il y a 0-7 jours
                    sentTo: premiumUsers.map(user => ({
                        user: user._id,
                        sentAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000), // Envoyée il y a 0-6 jours
                        opened: Math.random() > 0.3, // 70% de chance d'être ouverte
                        clicked: Math.random() > 0.7 // 30% de chance d'être cliquée
                    }))
                });
                await alert.save();
                createdCount++;
                console.log(`✅ Alerte créée: ${alert.origin} → ${alert.destination} (${alert.airline})`);
            }
            else {
                console.log(`⏭️  Alerte existante ignorée: ${alertData.origin} → ${alertData.destination}`);
            }
        }
        console.log(`🎉 ${createdCount} nouvelles alertes créées pour ${premiumUsers.length} utilisateurs premium`);
        // Créer quelques alertes récentes pour montrer l'activité
        const recentAlertsData = [
            {
                origin: 'CDG',
                destination: 'IST',
                airline: 'Turkish Airlines',
                price: 180,
                discountPercentage: 60,
                expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 jour
            },
            {
                origin: 'ORY',
                destination: 'MAD',
                airline: 'Iberia',
                price: 85,
                discountPercentage: 55,
                expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 heures
            }
        ];
        for (const alertData of recentAlertsData) {
            const alert = new Alert_1.default({
                ...alertData,
                detectedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000), // Créée il y a 0-2 heures
                sentTo: premiumUsers.slice(0, 2).map(user => ({
                    user: user._id,
                    sentAt: new Date(Date.now() - Math.random() * 1 * 60 * 60 * 1000), // Envoyée il y a 0-1 heure
                    opened: false,
                    clicked: false
                }))
            });
            await alert.save();
            console.log(`🆕 Alerte récente créée: ${alert.origin} → ${alert.destination} (${alert.airline})`);
        }
    }
    catch (error) {
        console.error('❌ Erreur lors de la création des alertes de test:', error);
    }
}
// Fonction pour nettoyer les anciennes alertes de test
async function cleanupOldAlerts() {
    try {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await Alert_1.default.deleteMany({
            detectedAt: { $lt: oneMonthAgo }
        });
        console.log(`🧹 ${result.deletedCount} anciennes alertes supprimées`);
    }
    catch (error) {
        console.error('❌ Erreur lors du nettoyage des alertes:', error);
    }
}

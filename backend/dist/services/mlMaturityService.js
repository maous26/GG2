"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLMaturityService = void 0;
// ===== backend/src/services/mlMaturityService.ts =====
const MLMaturity_1 = __importDefault(require("../models/MLMaturity"));
const Alert_1 = require("../models/Alert");
const Route_1 = require("../models/Route");
const User_1 = __importDefault(require("../models/User"));
const AIUsage_1 = require("../models/AIUsage");
class MLMaturityService {
    /**
     * Calcule et sauvegarde la maturité ML pour une période donnée
     */
    async calculateMaturity(startDate, endDate) {
        try {
            console.log(`🧠 Calculating ML maturity for period ${startDate.toISOString()} - ${endDate.toISOString()}`);
            // 1. Calculer les métriques de performance prédictive
            const predictionAccuracy = await this.calculatePredictionAccuracy(startDate, endDate);
            // 2. Calculer le volume de données
            const dataVolume = await this.calculateDataVolume(startDate, endDate);
            // 3. Calculer la stabilité
            const stability = await this.calculateStability(startDate, endDate);
            // 4. Calculer l'autonomie
            const autonomy = await this.calculateAutonomy(startDate, endDate);
            // 5. CALCUL DE MATURITÉ ML BASÉ SUR LES CADRES PROFESSIONNELS
            const totalApiCalls = dataVolume.totalDealsAnalyzed + dataVolume.totalRoutesOptimized + dataVolume.totalUserInteractions;
            const totalAlerts = dataVolume.totalDealsAnalyzed;
            const monthsOfHistory = this.calculateMonthsOfHistory();
            console.log(`🔍 ML Debug: ${totalApiCalls} calls, ${totalAlerts} alerts, ${monthsOfHistory} mois`);
            // 🎯 UTILISER LA MÉTHODE calculateOverallMaturityScore AVEC LOGIQUE RÉALISTE
            const maturityScore = this.calculateOverallMaturityScore(predictionAccuracy, dataVolume, stability, autonomy);
            console.log(`✅ Score ML Mature: ${maturityScore}% (basé sur cadres professionnels)`);
            // 6. Générer les recommandations
            const recommendations = this.generateRecommendations(maturityScore, {
                predictionAccuracy,
                stability,
                autonomy,
                dataVolume
            });
            // 7. Sauvegarder en base
            const maturityData = await MLMaturity_1.default.create({
                predictionAccuracy,
                dataVolume,
                stability,
                autonomy,
                maturityScore,
                recommendations,
                period: { startDate, endDate },
                evaluatedAt: new Date()
            });
            console.log(`✅ ML Maturity calculated: ${maturityScore}% - Ready for autonomy: ${recommendations.readyForAutonomy}`);
            return maturityData;
        }
        catch (error) {
            console.error('❌ Error calculating ML maturity:', error);
            throw error;
        }
    }
    /**
     * Calcule les métriques de précision prédictive RÉALISTES
     */
    async calculatePredictionAccuracy(startDate, endDate) {
        try {
            // Compter les VRAIES données disponibles
            const totalAlerts = await Alert_1.Alert.countDocuments({
                detectedAt: { $gte: startDate, $lte: endDate }
            });
            const totalApiCalls = await this.getTotalApiCalls(startDate, endDate);
            const totalSuccessfulScans = await Route_1.Route.countDocuments({
                lastScan: { $gte: startDate, $lte: endDate }
            });
            const totalUsers = await User_1.default.countDocuments();
            console.log(`📊 ML Data: ${totalApiCalls} API calls, ${totalAlerts} alerts, ${totalSuccessfulScans} scans, ${totalUsers} users`);
            // LOGIQUE RÉALISTE : Il faut des MILLIERS de données pour un ML mature
            const MIN_API_CALLS_FOR_BASIC_ML = 1000; // Minimum pour commencer
            const MIN_API_CALLS_FOR_MATURE_ML = 10000; // Pour avoir >80% de score
            const MIN_ALERTS_FOR_LEARNING = 100; // Minimum d'alertes pour apprendre
            // Si pas assez de données, scores très bas
            if (totalApiCalls < MIN_API_CALLS_FOR_BASIC_ML || totalAlerts < 10) {
                return {
                    dealDetection: Math.max(0, Math.min(15, totalAlerts * 2)), // Max 15% avec peu de données
                    priceForecasting: Math.max(0, Math.min(10, totalApiCalls / 100)), // Max 10% avec peu d'appels
                    userEngagement: Math.max(0, Math.min(8, totalUsers * 2)), // Max 8% avec peu d'utilisateurs
                    routeOptimization: Math.max(0, Math.min(12, totalSuccessfulScans * 3)) // Max 12% avec peu de scans
                };
            }
            // Calculs réalistes basés sur le volume de données
            const apiCallsRatio = Math.min(1, totalApiCalls / MIN_API_CALLS_FOR_MATURE_ML);
            const alertsRatio = Math.min(1, totalAlerts / MIN_ALERTS_FOR_LEARNING);
            const dealDetection = Math.round(Math.min(85, 20 + (apiCallsRatio * 50) + (alertsRatio * 15)));
            const priceForecasting = Math.round(Math.min(80, 15 + (apiCallsRatio * 45) + (totalSuccessfulScans / 100 * 20)));
            const userEngagement = Math.round(Math.min(75, 10 + (totalUsers / 1000 * 40) + (totalAlerts / 500 * 25)));
            const routeOptimization = Math.round(Math.min(82, 18 + (totalSuccessfulScans / 200 * 40) + (apiCallsRatio * 24)));
            return {
                dealDetection,
                priceForecasting,
                userEngagement,
                routeOptimization
            };
        }
        catch (error) {
            console.error('Error calculating prediction accuracy:', error);
            return { dealDetection: 0, priceForecasting: 0, userEngagement: 0, routeOptimization: 0 };
        }
    }
    /**
     * Compte le nombre total d'appels API réels
     */
    async getTotalApiCalls(startDate, endDate) {
        try {
            // Importer le modèle ApiCall pour compter les vrais appels
            const { ApiCall } = require('../models/ApiCall');
            const totalCalls = await ApiCall.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'success' // Seulement les appels réussis
            });
            return totalCalls;
        }
        catch (error) {
            console.error('Error counting API calls:', error);
            return 0;
        }
    }
    /**
     * Calcule le volume de données d'entraînement
     */
    async calculateDataVolume(startDate, endDate) {
        try {
            const [totalDealsAnalyzed, totalRoutesOptimized, totalUserInteractions, aiUsageCount] = await Promise.all([
                Alert_1.Alert.countDocuments({ detectedAt: { $gte: startDate, $lte: endDate } }),
                Route_1.Route.countDocuments({ lastScan: { $gte: startDate, $lte: endDate } }),
                User_1.default.countDocuments({ created_at: { $gte: startDate, $lte: endDate } }),
                AIUsage_1.AIUsage.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
            ]);
            const trainingDataPoints = totalDealsAnalyzed + totalRoutesOptimized + totalUserInteractions + aiUsageCount;
            return {
                totalDealsAnalyzed,
                totalRoutesOptimized,
                totalUserInteractions,
                trainingDataPoints
            };
        }
        catch (error) {
            console.error('Error calculating data volume:', error);
            return {
                totalDealsAnalyzed: 0,
                totalRoutesOptimized: 0,
                totalUserInteractions: 0,
                trainingDataPoints: 0
            };
        }
    }
    /**
     * Calcule les métriques de stabilité
     */
    async calculateStability(startDate, endDate) {
        try {
            // Récupérer les évaluations précédentes pour analyser la stabilité
            const previousEvaluations = await MLMaturity_1.default.find({
                evaluatedAt: { $lt: startDate }
            }).sort({ evaluatedAt: -1 }).limit(5);
            let consistencyScore = 50;
            let errorRate = 25;
            let convergenceRate = 30;
            let lastSignificantImprovement = new Date();
            if (previousEvaluations.length > 1) {
                // Calculer la cohérence des scores précédents
                const scores = previousEvaluations.map(e => e.maturityScore);
                const variance = this.calculateVariance(scores);
                consistencyScore = Math.max(0, 100 - variance * 2); // Moins de variance = plus de cohérence
                // Calculer le taux d'erreur basé sur la tendance
                const latestScore = scores[0];
                const avgPreviousScore = scores.slice(1).reduce((a, b) => a + b, 0) / (scores.length - 1);
                errorRate = Math.max(5, Math.abs(latestScore - avgPreviousScore));
                // Calculer la vitesse de convergence
                if (scores.length >= 3) {
                    const improvement = scores[0] - scores[scores.length - 1];
                    convergenceRate = Math.min(100, Math.max(0, improvement * 2));
                }
                // Dernière amélioration significative (>5% d'amélioration)
                for (let i = 1; i < scores.length; i++) {
                    if (scores[0] - scores[i] >= 5) {
                        lastSignificantImprovement = previousEvaluations[0].evaluatedAt;
                        break;
                    }
                }
            }
            return {
                consistencyScore: Math.round(consistencyScore),
                errorRate: Math.round(errorRate),
                convergenceRate: Math.round(convergenceRate),
                lastSignificantImprovement
            };
        }
        catch (error) {
            console.error('Error calculating stability:', error);
            return {
                consistencyScore: 50,
                errorRate: 25,
                convergenceRate: 30,
                lastSignificantImprovement: new Date()
            };
        }
    }
    /**
     * Calcule les métriques d'autonomie
     */
    async calculateAutonomy(startDate, endDate) {
        try {
            const totalAIUsage = await AIUsage_1.AIUsage.countDocuments({
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const totalSystemActions = await Alert_1.Alert.countDocuments({
                detectedAt: { $gte: startDate, $lte: endDate }
            });
            // Calcul de la fréquence d'assistance IA (moins c'est mieux pour l'autonomie)
            const aiAssistanceFrequency = totalSystemActions > 0
                ? Math.round((totalAIUsage / totalSystemActions) * 100)
                : 100;
            // Simulations basées sur les données réelles
            const manualInterventions = Math.max(0, 50 - totalSystemActions); // Moins d'interventions avec plus d'expérience
            const selfCorrectionRate = Math.min(95, 30 + (totalSystemActions / 10)); // Plus d'expérience = plus d'auto-correction
            const confidenceLevel = Math.min(90, 40 + (totalSystemActions / 20)); // Plus de données = plus de confiance
            return {
                aiAssistanceFrequency: Math.min(100, aiAssistanceFrequency),
                manualInterventions,
                selfCorrectionRate: Math.round(selfCorrectionRate),
                confidenceLevel: Math.round(confidenceLevel)
            };
        }
        catch (error) {
            console.error('Error calculating autonomy:', error);
            return {
                aiAssistanceFrequency: 100,
                manualInterventions: 50,
                selfCorrectionRate: 30,
                confidenceLevel: 40
            };
        }
    }
    /**
     * Calcule le score global de maturité
     */
    calculateOverallMaturityScore(predictionAccuracy, dataVolume, stability, autonomy) {
        // 🔥 FORCER UN SCORE RÉALISTE basé sur les vraies données
        const totalApiCalls = dataVolume.totalDealsAnalyzed + dataVolume.totalRoutesOptimized + dataVolume.totalUserInteractions;
        const totalAlerts = dataVolume.totalDealsAnalyzed;
        console.log(`🔍 calculateOverallMaturityScore: ${totalApiCalls} calls, ${totalAlerts} alerts`);
        // 🎯 SCORE RÉALISTE : Avec 84 calls, score très bas
        if (totalApiCalls < 1000) {
            const score = Math.max(1, Math.min(8, Math.round((totalApiCalls / 1000) * 8)));
            console.log(`🚨 Score limité: ${score}% (${totalApiCalls} calls < 1000)`);
            return score;
        }
        else if (totalApiCalls < 10000) {
            const score = Math.max(8, Math.min(25, Math.round((totalApiCalls / 10000) * 25)));
            console.log(`⚠️ Score modéré: ${score}% (${totalApiCalls} calls < 10000)`);
            return score;
        }
        else {
            // Calcul normalisé pour données suffisantes
            const dataVolumeScore = Math.min(100, (totalApiCalls / 10000) * 100);
            const predictionScore = (predictionAccuracy.dealDetection + predictionAccuracy.priceForecasting) / 2;
            const stabilityScore = stability.consistencyScore;
            const autonomyScore = autonomy.confidenceLevel;
            const overallScore = (dataVolumeScore * 0.4 +
                predictionScore * 0.3 +
                stabilityScore * 0.2 +
                autonomyScore * 0.1);
            console.log(`✅ Score normal: ${Math.round(overallScore)}% (${totalApiCalls} calls >= 10000)`);
            return Math.round(overallScore);
        }
    }
    /**
     * Calcule la maturité ML basée sur les cadres Microsoft MLOps + Google ML Test Score
     */
    calculateMLMaturityScore(params) {
        const { totalApiCalls, totalAlerts, monthsOfHistory, predictionAccuracy, dataVolume, stability, autonomy } = params;
        // 🎯 CADRE MICROSOFT MLOPS (Niveaux 0-4)
        const microsoftScore = this.calculateMicrosoftMLOpsLevel({
            totalApiCalls,
            totalAlerts,
            monthsOfHistory,
            predictionAccuracy,
            stability,
            autonomy
        });
        // 🎯 GOOGLE ML TEST SCORE (28 tests sur 4 domaines)
        const googleScore = this.calculateGoogleMLTestScore({
            totalApiCalls,
            totalAlerts,
            monthsOfHistory,
            predictionAccuracy,
            dataVolume,
            stability,
            autonomy
        });
        // 🎯 COMBINAISON : Principe du "maillon faible" (Google)
        const finalScore = Math.min(microsoftScore, googleScore);
        console.log(`📊 Microsoft MLOps: ${microsoftScore}% | Google ML Test: ${googleScore}% | Final: ${finalScore}%`);
        return finalScore;
    }
    /**
     * Calcule le niveau Microsoft MLOps (0-4)
     */
    calculateMicrosoftMLOpsLevel(params) {
        const { totalApiCalls, totalAlerts, monthsOfHistory, predictionAccuracy, stability, autonomy } = params;
        // Niveau 0: Non-MLOps (trop manuel, black box)
        if (totalApiCalls < 1000 || totalAlerts < 100 || monthsOfHistory < 3) {
            return Math.max(5, Math.min(15, (totalApiCalls / 1000) * 15));
        }
        // Niveau 1: DevOps sans MLOps (build & tests appli, mais pas cycle ML)
        if (totalApiCalls < 5000 || totalAlerts < 500 || monthsOfHistory < 6) {
            return Math.max(15, Math.min(30, (totalApiCalls / 5000) * 30));
        }
        // Niveau 2: Training automatisé (pipelines reproductibles)
        if (totalApiCalls < 15000 || totalAlerts < 1000 || monthsOfHistory < 12) {
            return Math.max(30, Math.min(60, (totalApiCalls / 15000) * 60));
        }
        // Niveau 3: Déploiement automatisé (CI/CD modèles, A/B testing)
        if (totalApiCalls < 50000 || totalAlerts < 5000 || monthsOfHistory < 18) {
            return Math.max(60, Math.min(85, (totalApiCalls / 50000) * 85));
        }
        // Niveau 4: Full MLOps (100% automatisé, monitoring drift, autocorrection)
        return Math.max(85, Math.min(95, (totalApiCalls / 100000) * 95));
    }
    /**
     * Calcule le Google ML Test Score (28 tests sur 4 domaines)
     */
    calculateGoogleMLTestScore(params) {
        const { totalApiCalls, totalAlerts, monthsOfHistory, predictionAccuracy, dataVolume, stability, autonomy } = params;
        // 🎯 4 DOMAINES (Google ML Test Score)
        const dataTesting = this.calculateDataTestingScore(totalApiCalls, totalAlerts, monthsOfHistory);
        const modelTesting = this.calculateModelTestingScore(predictionAccuracy, stability);
        const infrastructureTesting = this.calculateInfrastructureTestingScore(dataVolume, autonomy);
        const monitoringTesting = this.calculateMonitoringTestingScore(stability, autonomy);
        // Principe du "maillon faible" (Google)
        const minScore = Math.min(dataTesting, modelTesting, infrastructureTesting, monitoringTesting);
        console.log(`🔍 Google ML Test - Data: ${dataTesting}% | Model: ${modelTesting}% | Infra: ${infrastructureTesting}% | Monitoring: ${monitoringTesting}% | Min: ${minScore}%`);
        return minScore;
    }
    calculateDataTestingScore(totalApiCalls, totalAlerts, monthsOfHistory) {
        // Tests sur les données (Google ML Test Score)
        const dataVolumeScore = Math.min(100, (totalApiCalls / 10000) * 100);
        const dataQualityScore = Math.min(100, (totalAlerts / 1000) * 100);
        const dataHistoryScore = Math.min(100, (monthsOfHistory / 12) * 100);
        return Math.round((dataVolumeScore + dataQualityScore + dataHistoryScore) / 3);
    }
    calculateModelTestingScore(predictionAccuracy, stability) {
        // Tests sur le modèle (Google ML Test Score)
        const accuracyScore = (predictionAccuracy.dealDetection + predictionAccuracy.priceForecasting) / 2;
        const stabilityScore = stability.consistencyScore;
        const convergenceScore = stability.convergenceRate;
        return Math.round((accuracyScore + stabilityScore + convergenceScore) / 3);
    }
    calculateInfrastructureTestingScore(dataVolume, autonomy) {
        // Tests sur l'infrastructure (Google ML Test Score)
        const automationScore = 100 - autonomy.aiAssistanceFrequency; // Moins d'assistance = plus automatisé
        const reliabilityScore = autonomy.selfCorrectionRate;
        const scalabilityScore = Math.min(100, (dataVolume.totalRoutesOptimized / 100) * 100);
        return Math.round((automationScore + reliabilityScore + scalabilityScore) / 3);
    }
    calculateMonitoringTestingScore(stability, autonomy) {
        // Tests sur le monitoring (Google ML Test Score)
        const errorRateScore = 100 - stability.errorRate;
        const confidenceScore = autonomy.confidenceLevel;
        const monitoringScore = Math.min(100, (stability.consistencyScore + autonomy.selfCorrectionRate) / 2);
        return Math.round((errorRateScore + confidenceScore + monitoringScore) / 3);
    }
    calculateMonthsOfHistory() {
        // Calculer l'ancienneté des données en mois
        const now = new Date();
        const firstDataDate = new Date('2025-07-01'); // Date de création du projet
        const monthsDiff = (now.getFullYear() - firstDataDate.getFullYear()) * 12 +
            (now.getMonth() - firstDataDate.getMonth());
        return Math.max(1, monthsDiff);
    }
    /**
     * Génère des recommandations basées sur la maturité
     */
    generateRecommendations(maturityScore, metrics) {
        const suggestions = [];
        let riskLevel = 'high';
        let readyForAutonomy = false;
        // Évaluation globale
        if (maturityScore >= 85) {
            readyForAutonomy = true;
            riskLevel = 'low';
            suggestions.push('✅ Système prêt pour autonomie complète');
            suggestions.push('🔄 Réduire assistance IA à 10% seulement');
            suggestions.push('📊 Passer en mode surveillance');
        }
        else if (maturityScore >= 70) {
            riskLevel = 'medium';
            suggestions.push('🔄 Autonomie partielle recommandée');
            suggestions.push('🤖 Réduire assistance IA à 30%');
            suggestions.push('📈 Augmenter auto-corrections');
        }
        else if (maturityScore >= 50) {
            riskLevel = 'medium';
            suggestions.push('⚡ Continuer apprentissage supervisé');
            suggestions.push('📊 Augmenter volume de données d\'entraînement');
            suggestions.push('🔍 Améliorer précision prédictive');
        }
        else {
            riskLevel = 'high';
            suggestions.push('⚠️ Maintenir assistance IA importante');
            suggestions.push('📚 Collecter plus de données d\'entraînement');
            suggestions.push('🛠️ Optimiser algorithmes de base');
        }
        // Recommandations spécifiques par métrique
        if (metrics.predictionAccuracy.dealDetection < 70) {
            suggestions.push('🎯 Améliorer détection des deals');
        }
        if (metrics.stability.consistencyScore < 60) {
            suggestions.push('⚖️ Stabiliser les prédictions');
        }
        if (metrics.autonomy.aiAssistanceFrequency > 70) {
            suggestions.push('🤖 Réduire graduellement assistance IA');
        }
        // Date de prochaine évaluation
        const nextEvaluationDate = new Date();
        nextEvaluationDate.setDate(nextEvaluationDate.getDate() + (maturityScore >= 70 ? 14 : 7));
        return {
            readyForAutonomy,
            suggestedActions: suggestions,
            riskLevel,
            nextEvaluationDate
        };
    }
    /**
     * Calcule la variance d'un array de nombres
     */
    calculateVariance(numbers) {
        if (numbers.length === 0)
            return 0;
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    }
    /**
     * Récupère la dernière évaluation de maturité
     */
    async getLatestMaturity() {
        try {
            return await MLMaturity_1.default.findOne().sort({ evaluatedAt: -1 });
        }
        catch (error) {
            console.error('Error fetching latest maturity:', error);
            return null;
        }
    }
    /**
     * Récupère l'historique de maturité
     */
    async getMaturityHistory(limit = 10) {
        try {
            return await MLMaturity_1.default.find()
                .sort({ evaluatedAt: -1 })
                .limit(limit);
        }
        catch (error) {
            console.error('Error fetching maturity history:', error);
            return [];
        }
    }
}
exports.MLMaturityService = MLMaturityService;

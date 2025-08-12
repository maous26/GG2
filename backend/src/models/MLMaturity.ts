// ===== backend/src/models/MLMaturity.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface IMLMaturity extends Document {
  // Métriques de performance prédictive
  predictionAccuracy: {
    dealDetection: number; // % de deals correctement prédits
    priceForecasting: number; // % de prédictions de prix justes
    userEngagement: number; // % de prédictions d'engagement utilisateur correctes
    routeOptimization: number; // % de recommandations de routes adoptées
  };
  
  // Métriques de volume de données
  dataVolume: {
    totalDealsAnalyzed: number;
    totalRoutesOptimized: number;
    totalUserInteractions: number;
    trainingDataPoints: number;
  };
  
  // Métriques de stabilité
  stability: {
    consistencyScore: number; // Cohérence des prédictions dans le temps
    errorRate: number; // Taux d'erreur moyen
    convergenceRate: number; // Vitesse de convergence de l'apprentissage
    lastSignificantImprovement: Date; // Dernière amélioration significative
  };
  
  // Métriques d'autonomie
  autonomy: {
    aiAssistanceFrequency: number; // Fréquence d'utilisation de l'IA (%)
    manualInterventions: number; // Nombre d'interventions manuelles
    selfCorrectionRate: number; // Capacité d'auto-correction
    confidenceLevel: number; // Niveau de confiance moyen des prédictions
  };
  
  // Score global de maturité (0-100)
  maturityScore: number;
  
  // Recommandations du système
  recommendations: {
    readyForAutonomy: boolean;
    suggestedActions: string[];
    riskLevel: 'low' | 'medium' | 'high';
    nextEvaluationDate: Date;
  };
  
  // Métadonnées
  evaluatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

const MLMaturitySchema = new Schema({
  predictionAccuracy: {
    dealDetection: { type: Number, default: 0, min: 0, max: 100 },
    priceForecasting: { type: Number, default: 0, min: 0, max: 100 },
    userEngagement: { type: Number, default: 0, min: 0, max: 100 },
    routeOptimization: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  dataVolume: {
    totalDealsAnalyzed: { type: Number, default: 0 },
    totalRoutesOptimized: { type: Number, default: 0 },
    totalUserInteractions: { type: Number, default: 0 },
    trainingDataPoints: { type: Number, default: 0 }
  },
  
  stability: {
    consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    errorRate: { type: Number, default: 100, min: 0, max: 100 },
    convergenceRate: { type: Number, default: 0, min: 0, max: 100 },
    lastSignificantImprovement: { type: Date, default: Date.now }
  },
  
  autonomy: {
    aiAssistanceFrequency: { type: Number, default: 100, min: 0, max: 100 },
    manualInterventions: { type: Number, default: 0 },
    selfCorrectionRate: { type: Number, default: 0, min: 0, max: 100 },
    confidenceLevel: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  maturityScore: { type: Number, default: 0, min: 0, max: 100 },
  
  recommendations: {
    readyForAutonomy: { type: Boolean, default: false },
    suggestedActions: [{ type: String }],
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
    nextEvaluationDate: { type: Date, required: true }
  },
  
  evaluatedAt: { type: Date, default: Date.now },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }
}, {
  timestamps: true
});

// Index pour les requêtes par période
MLMaturitySchema.index({ evaluatedAt: -1 });
MLMaturitySchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
MLMaturitySchema.index({ maturityScore: -1 });

const MLMaturity = mongoose.model<IMLMaturity>('MLMaturity', MLMaturitySchema);

export { MLMaturity };
export default MLMaturity; 
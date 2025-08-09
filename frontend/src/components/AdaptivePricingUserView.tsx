import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Types for User-facing Adaptive Pricing
interface UserPricingData {
  user: {
    email: string;
    subscriptionType: 'free' | 'premium' | 'enterprise';
    adaptiveThreshold: number;
    totalSavings: number;
    alertsReceived: number;
  };
  recentAlerts: Array<{
    _id: string;
    route: string;
    origin: string;
    destination: string;
    airline: string;
    price: number;
    discountPercentage: number;
    savings: number;
    detectedAt: string;
    validationScore: number;
    recommendation: string;
    validationMethod: string;
    adaptiveThreshold: number;
    isAdaptive: boolean;
    baggagePolicy?: {
      cabin: {
        included: boolean;
        weight: string;
        dimensions: string;
      };
      checked: {
        included: boolean;
        weight: string;
        price: number;
        currency: string;
      };
      additional: {
        extraBagPrice: number;
        sportEquipment: boolean;
        currency: string;
      };
      details?: {
        restrictions: string;
        specialItems: string;
        weight_limit_cabin: string;
        weight_limit_checked: string;
      };
    };
  }>;
  thresholdInfo: {
    yourThreshold: number;
    systemAverage: number;
    segmentAverage: number;
    explanation: string;
  };
  aiInsights: {
    personalizedRecommendations: string[];
    savingsOptimization: string;
    nextBestRoutes: Array<{
      route: string;
      predictedSavings: number;
      confidence: number;
    }>;
  };
}

interface AdaptivePricingUserViewProps {
  user: {
    email: string;
    subscription_type: 'free' | 'premium' | 'enterprise';
  };
}

const AdaptivePricingUserView: React.FC<AdaptivePricingUserViewProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserPricingData | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPricingData();
  }, []);

  const fetchUserPricingData = async () => {
    try {
      const response = await axios.get('/api/users/adaptive-pricing');
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user pricing data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case 'enterprise': return '👑';
      case 'premium': return '💎';
      case 'free': return '🆓';
      default: return '❓';
    }
  };

  const getSubscriptionColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'from-purple-500 to-indigo-600';
      case 'premium': return 'from-yellow-400 to-orange-500';
      case 'free': return 'from-gray-400 to-gray-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getValidationMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'statistical': return '📊';
      case 'predictive': return '🔮';
      case 'contextual': return '🎯';
      default: return '🤖';
    }
  };

  const getValidationScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil adaptatif...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Données non disponibles</h3>
        <p className="text-gray-600">Impossible de charger vos données de prix adaptatif</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Profile Header */}
      <div className={`bg-gradient-to-r ${getSubscriptionColor(data.user.subscriptionType)} rounded-xl p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">{getSubscriptionIcon(data.user.subscriptionType)}</span>
              <div>
                <h2 className="text-2xl font-bold">Prix Adaptatif Personnel</h2>
                <p className="text-sm opacity-90">
                  {data.user.email} • Compte {data.user.subscriptionType}
                </p>
              </div>
            </div>
            <p className="text-sm opacity-80">
              🧠 Votre seuil intelligent: {formatPercentage(data.user.adaptiveThreshold)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {formatCurrency(data.user.totalSavings)}
            </div>
            <div className="text-sm opacity-90">
              Économies totales ({data.user.alertsReceived} alertes)
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive Threshold Explanation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Votre Seuil Adaptatif Personnel</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(data.thresholdInfo.yourThreshold)}
            </div>
            <div className="text-sm font-medium text-blue-700">Votre seuil</div>
            <div className="text-xs text-blue-600">Personnalisé pour vous</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {formatPercentage(data.thresholdInfo.segmentAverage)}
            </div>
            <div className="text-sm font-medium text-gray-700">Moyenne segment</div>
            <div className="text-xs text-gray-600">Utilisateurs {data.user.subscriptionType}</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatPercentage(data.thresholdInfo.systemAverage)}
            </div>
            <div className="text-sm font-medium text-purple-700">Système global</div>
            <div className="text-xs text-purple-600">Tous utilisateurs</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Comment ça marche</h4>
          <p className="text-sm text-blue-800">
            {data.thresholdInfo.explanation}
          </p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🤖 Insights IA Personnalisés</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">📋 Recommandations</h4>
            <div className="space-y-2">
              {data.aiInsights.personalizedRecommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-sm text-gray-700">{rec}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">🎯 Prochaines Opportunités</h4>
            <div className="space-y-3">
              {data.aiInsights.nextBestRoutes.map((route, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{route.route}</span>
                    <span className="text-sm text-green-600 font-semibold">
                      {formatCurrency(route.predictedSavings)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Confiance: {formatPercentage(route.confidence)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-1">💰 Optimisation Économies</h4>
          <p className="text-sm text-green-800">{data.aiInsights.savingsOptimization}</p>
        </div>
      </div>

      {/* Recent Adaptive Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🚨 Vos Alertes Adaptatives Récentes</h3>
        
        <div className="space-y-4">
          {data.recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>Aucune alerte récente</p>
              <p className="text-sm">Votre système adaptatif recherche les meilleures offres...</p>
            </div>
          ) : (
            data.recentAlerts.map((alert) => (
              <div 
                key={alert._id} 
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedAlert === alert._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAlert(selectedAlert === alert._id ? null : alert._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">✈️</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {alert.route} • {alert.airline}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(alert.detectedAt).toLocaleDateString('fr-FR')} à {new Date(alert.detectedAt).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          -{formatPercentage(alert.discountPercentage)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(alert.price)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(alert.savings)}
                        </div>
                        <div className="text-xs text-gray-600">économisés</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Alert Details */}
                {selectedAlert === alert._id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-2">🎯 Validation IA</h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Score:</span>
                            <span className={`px-2 py-1 rounded text-xs ${getValidationScoreColor(alert.validationScore)}`}>
                              {alert.validationScore}/100
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Méthode:</span>
                            <span className="flex items-center space-x-1">
                              <span>{getValidationMethodIcon(alert.validationMethod)}</span>
                              <span>{alert.validationMethod}</span>
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Recommandation:</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              alert.recommendation === 'SEND' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {alert.recommendation}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3">
                        <h5 className="font-medium text-blue-900 mb-2">📊 Seuil Adaptatif</h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Seuil utilisé:</span>
                            <span className="font-semibold text-blue-600">
                              {formatPercentage(alert.adaptiveThreshold)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Type:</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              alert.isAdaptive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {alert.isAdaptive ? 'Adaptatif' : 'Fixe'}
                            </span>
                          </div>
                          <div className="text-xs text-blue-700 mt-2">
                            {alert.isAdaptive 
                              ? '🧠 Calculé par IA pour optimiser vos économies'
                              : '📏 Seuil fixe traditionnel'
                            }
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3">
                        <h5 className="font-medium text-green-900 mb-2">💰 Impact Financier</h5>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Prix original:</span>
                            <span className="line-through text-gray-600">
                              {formatCurrency(alert.price / (1 - alert.discountPercentage / 100))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Prix alerte:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(alert.price)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Économies:</span>
                            <span className="text-green-600">
                              {formatCurrency(alert.savings)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-center">
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        🔍 Voir l'offre complète
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upgrade Suggestion (for free users) */}
      {data.user.subscriptionType === 'free' && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center">
            <span className="text-4xl mr-4">⭐</span>
            <div>
              <h3 className="text-xl font-bold mb-1">
                Débloquez tout le potentiel de l'IA !
              </h3>
              <p className="text-yellow-100 mb-3">
                Passez au Premium pour un seuil adaptatif de {formatPercentage(25)} 
                (vs {formatPercentage(35)} gratuit) et des prédictions plus précises.
              </p>
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                💎 Passer au Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptivePricingUserView;

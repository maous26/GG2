import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Types for Adaptive Pricing - matching actual API response
interface AdaptivePricingData {
  systemOverview: {
    transformationStatus: string;
    adaptiveSystem: string;
    totalRoutes: number;
    totalAlerts: number;
    avgValidationScore: number;
    aiValidationRate: number;
  };
  strategicRoutes: Array<{
    _id: string;
    hubAirport: string;
    routeName: string;
    tier: number;
    adaptiveThreshold: number;
    isActive: boolean;
    performance: {
      roi: number;
    };
  }>;
  pricePredictions: Array<{
    _id: string;
    route: string;
    predictedPrice: {
      '7days': number;
    };
    confidence: {
      '7days': number;
    };
    marketTrend: string;
  }>;
  validationStatistics: {
    totalProcessed: number;
    validated: number;
    rejected: number;
    methods: {
      statistical: number;
      predictive: number;
      contextual: number;
    };
    avgScore: number;
  };
}

interface UserSegmentThresholds {
  free: number;
  premium: number;
  enterprise: number;
}

const AdaptivePricingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdaptivePricingData | null>(null);
  const [userThresholds] = useState<UserSegmentThresholds>({
    free: 35,
    premium: 25,
    enterprise: 20
  });

  useEffect(() => {
    fetchAdaptivePricingData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAdaptivePricingData, 60000);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchAdaptivePricingData = async () => {
    try {
      const response = await axios.get('/api/admin/adaptive-pricing');
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching adaptive pricing data:', error);
      setLoading(false);
    }
  };

  const optimizeRoute = async (routeId: string) => {
    try {
      await axios.post(`/api/admin/strategic-routes/${routeId}/optimize`);
      fetchAdaptivePricingData(); // Refresh data
    } catch (error) {
      console.error('Error optimizing route:', error);
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

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-purple-100 text-purple-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'MONITOR': return '📊';
      case 'BUY_NOW': return '🚀';
      case 'WAIT': return '⏳';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du système adaptatif...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Données non disponibles</h2>
          <p className="text-gray-600">Impossible de charger les données du système adaptatif</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🧠 Système de Prix Adaptatif AI</h1>
            <p className="text-blue-100">
              Transformation réussie: de seuils fixes 30% vers intelligence adaptative
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Dernière mise à jour</div>
            <div className="text-lg font-semibold">
              {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {/* AI System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Routes Totales</h3>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {data.systemOverview.totalRoutes}
          </div>
          <p className="text-sm text-gray-500">
            Routes surveillées
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Système Adaptatif</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {data.systemOverview.adaptiveSystem}
          </div>
          <p className="text-sm text-green-600">
            🎉 Remplace le seuil fixe 30%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Validation IA</h3>
            <span className="text-2xl">🤖</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {formatPercentage(data.systemOverview.aiValidationRate)}
          </div>
          <p className="text-sm text-gray-500">
            Précision du système IA
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Score Validation</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {data.systemOverview.avgValidationScore.toFixed(1)}
          </div>
          <p className="text-sm text-gray-500">
            Score moyen IA
          </p>
        </div>
      </div>

      {/* User Segment Thresholds */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">👥 Seuils par Segment Utilisateur</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">🆓 Gratuit</span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">Basique</span>
            </div>
            <div className="text-3xl font-bold text-gray-700">
              {formatPercentage(userThresholds.free)}
            </div>
            <p className="text-sm text-gray-500">Seuil de validation</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-700">💎 Premium</span>
              <span className="text-xs bg-yellow-200 px-2 py-1 rounded text-yellow-800">Avancé</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600">
              {formatPercentage(userThresholds.premium)}
            </div>
            <p className="text-sm text-yellow-600">Plus de sensibilité</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">👑 Enterprise</span>
              <span className="text-xs bg-purple-200 px-2 py-1 rounded text-purple-800">Expert</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {formatPercentage(userThresholds.enterprise)}
            </div>
            <p className="text-sm text-purple-600">Maximum de précision</p>
          </div>
        </div>
      </div>

      {/* Strategic Routes Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">🗺️ Routes Stratégiques Adaptatives</h2>
          <button
            onClick={fetchAdaptivePricingData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            🔄 Actualiser
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hub & Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seuil Adaptatif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.strategicRoutes.map((route) => (
                <tr key={route._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">✈️</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {route.routeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Hub: {route.hubAirport}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {route.hubAirport}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(route.tier)}`}>
                      Tier {route.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-indigo-600">
                      {formatPercentage(route.adaptiveThreshold)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Seuil adaptatif actuel
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Performance IA
                    </div>
                    <div className="text-sm text-gray-500">
                      {route.isActive ? 'Actif' : 'Inactif'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(route.performance.roi)}`}>
                      {formatPercentage(route.performance.roi)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => optimizeRoute(route._id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      🎯 Optimiser
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900"
                    >
                      📊 Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Price Predictions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">🔮 Prédictions IA des Prix</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.pricePredictions.slice(0, 6).map((prediction) => (
            <div key={prediction._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {prediction.route}
                </span>
                <span className="text-lg">
                  {getTrendIcon(prediction.marketTrend)}
                </span>
              </div>
              
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(prediction.predictedPrice['7days'])}
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Confiance: {formatPercentage(prediction.confidence['7days'])}</span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(prediction.confidence['7days'])}`}>
                  {prediction.marketTrend}
                </span>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                <div>Prédiction 7 jours</div>
                <div>Système IA actif</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Validation Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Validation des Alertes</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Total traitées</span>
              <span className="text-lg font-bold text-blue-600">
                {data.validationStatistics.totalProcessed}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Validées</span>
              <span className="text-lg font-bold text-green-600">
                {data.validationStatistics.validated}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium">Rejetées</span>
              <span className="text-lg font-bold text-red-600">
                {data.validationStatistics.rejected}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Score moyen</span>
                <span className="text-xl font-bold text-purple-600">
                  {data.validationStatistics.avgScore.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">🧠 Méthodes de Validation IA</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm font-medium">📊 Statistique</div>
                <div className="text-xs text-gray-600">Analyse historique</div>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {data.validationStatistics.methods.statistical}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="text-sm font-medium">🔮 Prédictive</div>
                <div className="text-xs text-gray-600">Machine Learning</div>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {data.validationStatistics.methods.predictive}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm font-medium">🎯 Contextuelle</div>
                <div className="text-xs text-gray-600">Multi-facteurs</div>
              </div>
              <span className="text-lg font-bold text-green-600">
                {data.validationStatistics.methods.contextual}
              </span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Validation IA</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatPercentage(data.systemOverview.aiValidationRate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transformation Success Message */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center">
          <span className="text-4xl mr-4">🎉</span>
          <div>
            <h3 className="text-xl font-bold mb-1">
              Transformation Stratégique Réussie !
            </h3>
            <p className="text-green-100">
              GlobeGenius a évolué d'un système de seuils fixes de 30% vers une intelligence 
              adaptative multi-niveaux avec validation IA. Le système optimise automatiquement 
              les seuils par route et segment utilisateur pour maximiser la performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptivePricingDashboard;

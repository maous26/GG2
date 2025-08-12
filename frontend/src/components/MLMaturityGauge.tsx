import React, { useEffect, useState } from 'react';

interface MLMaturityData {
  maturityScore: number;
  predictionAccuracy: {
    dealDetection: number;
    priceForecasting: number;
    userEngagement: number;
    routeOptimization: number;
  };
  stability: {
    consistencyScore: number;
    errorRate: number;
    convergenceRate: number;
    lastSignificantImprovement: string;
  };
  autonomy: {
    aiAssistanceFrequency: number;
    manualInterventions: number;
    selfCorrectionRate: number;
    confidenceLevel: number;
  };
  dataVolume: {
    totalDealsAnalyzed: number;
    totalRoutesOptimized: number;
    totalUserInteractions: number;
    trainingDataPoints: number;
  };
  recommendations: {
    readyForAutonomy: boolean;
    suggestedActions: string[];
    riskLevel: 'low' | 'medium' | 'high';
    nextEvaluationDate: string;
  };
  evaluatedAt: string;
}

interface MaturityTrends {
  maturityTrend: 'improving' | 'stable' | 'declining';
  lastChange: number;
  projectedAutonomy: string | null;
}

const MLMaturityGauge: React.FC = () => {
  const [maturityData, setMaturityData] = useState<MLMaturityData | null>(null);
  const [trends, setTrends] = useState<MaturityTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchMaturityData();
    fetchTrends();
  }, []);

  const fetchMaturityData = async () => {
    try {
      const response = await fetch('/api/admin/ml-maturity');
      const data = await response.json();
      setMaturityData(data);
    } catch (error) {
      console.error('Error fetching ML maturity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await fetch('/api/admin/ml-maturity/history?limit=5');
      const data = await response.json();
      setTrends(data.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const recalculateMaturity = async () => {
    setCalculating(true);
    try {
      await fetch('/api/admin/ml-maturity/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 })
      });
      await fetchMaturityData();
      await fetchTrends();
    } catch (error) {
      console.error('Error recalculating maturity:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-100 border-green-300';
    if (score >= 70) return 'bg-yellow-100 border-yellow-300';
    if (score >= 50) return 'bg-orange-100 border-orange-300';
    return 'bg-red-100 border-red-300';
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[risk as keyof typeof colors];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!maturityData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 Maturité Machine Learning</h3>
        <p className="text-gray-600">Aucune donnée de maturité disponible.</p>
        <button
          onClick={recalculateMaturity}
          disabled={calculating}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {calculating ? 'Calcul...' : 'Calculer la maturité'}
        </button>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 45; // rayon = 45
  const strokeDasharray = `${(maturityData.maturityScore / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">🧠 Maturité Machine Learning</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
            >
              {showDetails ? 'Masquer' : 'Détails'}
            </button>
            <button
              onClick={recalculateMaturity}
              disabled={calculating}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {calculating ? 'Calcul...' : 'Recalculer'}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          {/* Jauge circulaire */}
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Cercle de fond */}
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Cercle de progression */}
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                className={getScoreColor(maturityData.maturityScore)}
                style={{
                  transition: 'stroke-dasharray 1s ease-in-out',
                }}
              />
            </svg>
            {/* Score au centre */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(maturityData.maturityScore)}`}>
                  {maturityData.maturityScore}%
                </div>
                <div className="text-xs text-gray-500">Maturité</div>
              </div>
            </div>
          </div>

          {/* Informations principales */}
          <div className="flex-1">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBackground(maturityData.maturityScore)}`}>
              {maturityData.recommendations.readyForAutonomy ? '✅ Prêt pour autonomie' : '🔄 En développement'}
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Niveau de risque</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadge(maturityData.recommendations.riskLevel)}`}>
                  {maturityData.recommendations.riskLevel.toUpperCase()}
                </span>
              </div>
              
              {trends && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tendance</span>
                  <span className={`flex items-center ${
                    trends.maturityTrend === 'improving' ? 'text-green-600' :
                    trends.maturityTrend === 'declining' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trends.maturityTrend === 'improving' ? '📈' : 
                     trends.maturityTrend === 'declining' ? '📉' : '➡️'}
                    <span className="ml-1 capitalize">{trends.maturityTrend}</span>
                    {trends.lastChange !== 0 && (
                      <span className="ml-1">({trends.lastChange > 0 ? '+' : ''}{trends.lastChange}%)</span>
                    )}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Dernière éval.</span>
                <span className="text-gray-900">{formatDate(maturityData.evaluatedAt)}</span>
              </div>

              {trends?.projectedAutonomy && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Autonomie prévue</span>
                  <span className="text-green-600">{formatDate(trends.projectedAutonomy)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détails étendus */}
        {showDetails && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* Métriques détaillées */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">🎯 Prédiction</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((maturityData.predictionAccuracy.dealDetection * 0.4) +
                             (maturityData.predictionAccuracy.priceForecasting * 0.3) +
                             (maturityData.predictionAccuracy.userEngagement * 0.2) +
                             (maturityData.predictionAccuracy.routeOptimization * 0.1))}%
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Deals: {maturityData.predictionAccuracy.dealDetection}%<br/>
                  Prix: {maturityData.predictionAccuracy.priceForecasting}%
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-green-900 mb-2">⚖️ Stabilité</h4>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((maturityData.stability.consistencyScore * 0.4) +
                             ((100 - maturityData.stability.errorRate) * 0.3) +
                             (maturityData.stability.convergenceRate * 0.3))}%
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Cohérence: {maturityData.stability.consistencyScore}%<br/>
                  Erreurs: {maturityData.stability.errorRate}%
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-purple-900 mb-2">🤖 Autonomie</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(((100 - maturityData.autonomy.aiAssistanceFrequency) * 0.4) +
                             (maturityData.autonomy.selfCorrectionRate * 0.3) +
                             (maturityData.autonomy.confidenceLevel * 0.3))}%
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  IA: {maturityData.autonomy.aiAssistanceFrequency}%<br/>
                  Auto-correct: {maturityData.autonomy.selfCorrectionRate}%
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-orange-900 mb-2">📊 Données</h4>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.min(100, Math.round((maturityData.dataVolume.trainingDataPoints / 1000) * 50 +
                                           (maturityData.dataVolume.totalDealsAnalyzed / 100) * 30 +
                                           (maturityData.dataVolume.totalRoutesOptimized / 50) * 20))}%
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  Points: {maturityData.dataVolume.trainingDataPoints}<br/>
                  Deals: {maturityData.dataVolume.totalDealsAnalyzed}
                </div>
              </div>
            </div>

            {/* Recommandations */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">💡 Recommandations</h4>
              <ul className="space-y-1">
                {maturityData.recommendations.suggestedActions.map((action, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-gray-600">
                Prochaine évaluation: {formatDate(maturityData.recommendations.nextEvaluationDate)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MLMaturityGauge; 
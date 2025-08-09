import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FinancialData {
  period: { range: string; startDate: string };
  revenue: {
    totalRevenue: number;
    monthlyGrowth: number;
    subscriptionDistribution: Array<{
      subscriptionType: string;
      userCount: number;
      avgAlertsReceived: number;
    }>;
    avgRevenuePerUser: number;
  };
  savings: {
    totalSavings: number;
    avgSavingsPerAlert: number;
    savingsByRoute: Array<{
      origin: string;
      destination: string;
      totalSavings: number;
    }>;
  };
  subscriptions: {
    conversionRate: number;
    churnRate: number;
    upgrades: number;
  };
  roi: {
    revenue: number;
    costs: number;
    profit: number;
    roi: number;
    userSavings: number;
    valueGenerated: number;
  };
}

interface FlightData {
  period: { range: string; startDate: string };
  routes: Array<{
    origin: string;
    destination: string;
    tier: number;
    totalAlerts: number;
    avgDiscount: number;
    avgPrice: number;
    scanFrequency: string;
  }>;
  airlines: Array<{
    airline: string;
    totalAlerts: number;
    avgDiscount: number;
    marketShare: number;
  }>;
  pricing: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    avgDiscount: number;
    maxDiscount: number;
    totalSavings: number;
    alertCount: number;
  };
  scanning: {
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    avgScanTime: number;
    successRate: number;
  };
  alerts: {
    avgDiscount: number;
    qualityRate: number;
    highQualityCount: number;
    totalCount: number;
    userSatisfaction: number;
  };
}

interface KPITabComponentProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export const FinancialTab: React.FC<KPITabComponentProps> = ({ timeRange, onTimeRangeChange }) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/kpis/financial?range=${timeRange}`);
      setFinancialData(response.data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined) => `${(value || 0).toFixed(1)}%`;

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number;
    icon?: string;
    color?: string;
  }> = ({ title, value, subtitle, trend, icon, color = 'blue' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold text-${color}-600`}>{value}</span>
        {trend !== undefined && (
          <span className={`text-sm font-medium ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend || 0).toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!financialData) {
    return <div className="text-center py-8 text-gray-500">Aucune donnée financière disponible</div>;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Chiffre d'Affaires"
          value={formatCurrency(financialData.revenue.totalRevenue)}
          trend={financialData.revenue.monthlyGrowth}
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Revenus par Utilisateur"
          value={formatCurrency(financialData.revenue.avgRevenuePerUser)}
          subtitle="ARPU"
          icon="👤"
          color="blue"
        />
        <MetricCard
          title="Économies Générées"
          value={formatCurrency(financialData.savings.totalSavings)}
          subtitle="Pour les utilisateurs"
          icon="🎯"
          color="purple"
        />
        <MetricCard
          title="ROI"
          value={formatPercent(financialData.roi.roi)}
          subtitle={`Profit: ${formatCurrency(financialData.roi.profit)}`}
          icon="📈"
          color="indigo"
        />
      </div>

      {/* Subscription Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Taux de Conversion"
          value={formatPercent(financialData.subscriptions.conversionRate)}
          subtitle="Gratuit → Premium"
          icon="⭐"
          color="yellow"
        />
        <MetricCard
          title="Taux d'Attrition"
          value={formatPercent(financialData.subscriptions.churnRate)}
          subtitle="Utilisateurs perdus"
          icon="📉"
          color="red"
        />
        <MetricCard
          title="Upgrades"
          value={financialData.subscriptions.upgrades}
          subtitle="Ce mois"
          icon="⬆️"
          color="green"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">💼 Répartition des Revenus par Abonnement</h3>
        <div className="space-y-4">
          {financialData.revenue.subscriptionDistribution.map((sub, index) => {
            const revenue = sub.userCount * (sub.subscriptionType === 'premium' ? 9.99 : 
                                            sub.subscriptionType === 'enterprise' ? 49.99 : 0);
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full ${
                    sub.subscriptionType === 'premium' ? 'bg-yellow-500' :
                    sub.subscriptionType === 'enterprise' ? 'bg-purple-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <span className="font-medium capitalize">{sub.subscriptionType}</span>
                    <p className="text-sm text-gray-600">{sub.userCount} utilisateurs</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(revenue)}</div>
                  <div className="text-sm text-gray-500">
                    {sub.avgAlertsReceived?.toFixed(1) || '0'} alertes moy.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Saving Routes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Routes les Plus Rentables</h3>
        <div className="space-y-3">
          {financialData.savings.savingsByRoute.slice(0, 10).map((route, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  index < 3 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium">{route.origin} → {route.destination}</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(route.totalSavings)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Health */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">💡 Santé Financière</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Analyse des Coûts</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Revenus:</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(financialData.roi.revenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Coûts:</span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(financialData.roi.costs)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Profit:</span>
                <span className={`text-sm font-bold ${
                  financialData.roi.profit > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(financialData.roi.profit)}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Valeur Générée</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Économies Utilisateurs:</span>
                <span className="text-sm font-medium text-blue-600">
                  {formatCurrency(financialData.roi.userSavings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Profit Business:</span>
                <span className="text-sm font-medium text-purple-600">
                  {formatCurrency(financialData.roi.profit)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Valeur Totale:</span>
                <span className="text-sm font-bold text-indigo-600">
                  {formatCurrency(financialData.roi.valueGenerated)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FlightTab: React.FC<KPITabComponentProps> = ({ timeRange, onTimeRangeChange }) => {
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlightData();
  }, [timeRange]);

  const fetchFlightData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/kpis/flights?range=${timeRange}`);
      setFlightData(response.data);
    } catch (error) {
      console.error('Error fetching flight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatNumber = (num: number | null | undefined, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!flightData) {
    return <div className="text-center py-8 text-gray-500">Aucune donnée de vol disponible</div>;
  }

  return (
    <div className="space-y-6">
      {/* Flight Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Scans Totaux</h3>
          <div className="text-2xl font-bold text-blue-600">{formatNumber(flightData.scanning.totalScans)}</div>
          <p className="text-sm text-gray-500">{(flightData.scanning?.successRate || 0).toFixed(1)}% succès</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Alertes Générées</h3>
          <div className="text-2xl font-bold text-green-600">{formatNumber(flightData.alerts.totalCount)}</div>
          <p className="text-sm text-gray-500">{(flightData.alerts?.qualityRate || 0).toFixed(1)}% haute qualité</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Prix Moyen</h3>
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(flightData.pricing.avgPrice)}</div>
          <p className="text-sm text-gray-500">{(flightData.pricing?.avgDiscount || 0).toFixed(1)}% réduction moy.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Économies Totales</h3>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(flightData.pricing.totalSavings)}</div>
          <p className="text-sm text-gray-500">{formatNumber(flightData.pricing.alertCount)} alertes</p>
        </div>
      </div>

      {/* Top Routes Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Top Routes Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Route</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Alertes</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Prix Moyen</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Réduction Moy.</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Fréquence</th>
              </tr>
            </thead>
            <tbody>
              {flightData.routes.slice(0, 10).map((route, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{route.origin} → {route.destination}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      route.tier === 1 ? 'bg-green-100 text-green-800' :
                      route.tier === 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Tier {route.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4">{route.totalAlerts}</td>
                  <td className="py-3 px-4">{formatCurrency(route.avgPrice)}</td>
                  <td className="py-3 px-4 text-green-600 font-medium">{(route.avgDiscount || 0).toFixed(1)}%</td>
                  <td className="py-3 px-4 text-gray-600">{route.scanFrequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Airlines Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">✈️ Analyse par Compagnie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flightData.airlines.slice(0, 6).map((airline, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{airline.airline}</span>
                <span className="text-sm text-gray-600">{(airline.marketShare || 0).toFixed(1)}% parts</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Alertes:</span>
                  <span className="text-sm font-medium">{airline.totalAlerts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Réduction moy.:</span>
                  <span className="text-sm font-medium text-green-600">{(airline.avgDiscount || 0).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scanning Efficiency */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🔍 Efficacité des Scans</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{formatNumber(flightData.scanning.totalScans)}</div>
            <div className="text-sm text-gray-600">Scans Totaux</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{formatNumber(flightData.scanning.successfulScans)}</div>
            <div className="text-sm text-gray-600">Réussis</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{formatNumber(flightData.scanning.failedScans)}</div>
            <div className="text-sm text-gray-600">Échoués</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{(flightData.scanning?.avgScanTime || 0).toFixed(1)}s</div>
            <div className="text-sm text-gray-600">Temps Moyen</div>
          </div>
        </div>
        
        {/* Success Rate Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Taux de Réussite</span>
            <span className="text-sm text-gray-600">{(flightData.scanning?.successRate || 0).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${
                flightData.scanning.successRate > 90 ? 'bg-green-500' :
                flightData.scanning.successRate > 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(flightData.scanning.successRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Alert Quality Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Qualité des Alertes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Métriques de Qualité</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Réduction moyenne:</span>
                <span className="text-lg font-bold text-green-600">{(flightData.alerts?.avgDiscount || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taux haute qualité:</span>
                <span className="text-lg font-bold text-blue-600">{(flightData.alerts?.qualityRate || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Satisfaction utilisateurs:</span>
                <span className="text-lg font-bold text-purple-600">{(flightData.alerts?.userSatisfaction || 0).toFixed(1)}/5</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-3">Distribution des Alertes</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Haute qualité (≥20%):</span>
                <span className="text-sm font-medium">{flightData.alerts.highQualityCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total alertes:</span>
                <span className="text-sm font-medium">{flightData.alerts.totalCount}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Ratio qualité:</span>
                <span className="text-sm font-bold text-indigo-600">
                  {flightData.alerts?.totalCount > 0 ? 
                    ((flightData.alerts?.highQualityCount || 0) / flightData.alerts.totalCount * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

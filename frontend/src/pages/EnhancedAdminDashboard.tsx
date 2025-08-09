import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FinancialTab, FlightTab } from '../components/KPITabs';
import AdaptivePricingDashboard from '../components/AdaptivePricingDashboard';
import FlightAPIMonitor from '../components/FlightAPIMonitor';

// User Management Interfaces
interface AdminUser {
  id: string;
  email: string;
  name: string;
  subscription_type: 'free' | 'premium' | 'enterprise';
  additionalAirports: string[];
  dreamDestinations: any[];
  onboardingCompleted: boolean;
  profileCompleteness: number;
  createdAt: string;
  lastLogin?: string;
}

// KPI Data Interfaces
interface KPIDashboardData {
  period: {
    range: string;
    startDate: string;
    endDate: string;
  };
  users: {
    total: number;
    active: number;
    new: number;
    premium: number;
    enterprise: number;
    retention: number;
    growth: number;
    conversionRate: number;
  };
  flights: {
    totalRoutes: number;
    activeRoutes: number;
    totalScans: number;
    successfulScans: number;
    scanSuccessRate: number;
    totalAlerts: number;
    alertsConversionRate: number;
    avgAlertsPerRoute: number;
  };
  financial: {
    totalSavings: number;
    avgSavingsPerAlert: number;
    premiumRevenue: number;
    revenuePerUser: number;
    savingsToRevenueRatio: number;
  };
  performance: {
    avgResponseTime: number;
    systemUptime: number;
    apiCallsSuccess: number;
    errorRate: number;
    availability: string;
  };
  ai: {
    maturityScore: number;
    predictionAccuracy: number;
    readyForAutonomy: boolean;
    riskLevel: string;
  };
  trends: Array<{
    date: string;
    requests: number;
    errors: number;
    successRate: number;
  }>;
}

interface RealtimeData {
  timestamp: string;
  realtime: {
    activeUsers: number;
    apiCallsPerHour: number;
    alertsPerHour: number;
    errorsPerHour: number;
    healthScore: number;
    status: string;
  };
  system: {
    health: {
      score: number;
      status: string;
      uptime: number;
      memory: {
        used: number;
        total: number;
        usage: number;
      };
    };
  };
}

interface UserAnalytics {
  period: { range: string; startDate: string };
  subscription: Array<{
    subscriptionType: string;
    userCount: number;
    avgAlertsReceived: number;
  }>;
  engagement: {
    avgSessionsPerUser: number;
    avgAlertsPerUser: number;
    activeUsersRatio: number;
  };
  lifetimeValue: {
    premiumLTV: number;
    enterpriseLTV: number;
    avgRetentionMonths: number;
    totalPotentialValue: number;
  };
}

interface SystemMetrics {
  period: { range: string; startDate: string };
  performance: {
    responseTime: Array<{
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
    }>;
    throughput: {
      requestsPerHour: number;
      totalRequests: number;
      peakHour: { hour: number; requests: number } | null;
    };
  };
  resources: {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    process: {
      uptime: number;
      pid: number;
      platform: string;
      version: string;
    };
  };
  database: {
    collections: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    objects: number;
  };
}

const EnhancedAdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // KPI Data States
  const [dashboardData, setDashboardData] = useState<KPIDashboardData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  
  // User Management States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      // Redirect to home instead of login
      window.location.href = '/';
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.subscription_type !== 'enterprise') {
      // Redirect to home instead of login
      window.location.href = '/';
      return;
    }

    setUser(parsedUser);
    
    // Set authorization header for all requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    fetchAllData();
    
    // Set up auto-refresh for real-time data
    const interval = setInterval(() => {
      fetchRealtimeData();
    }, 30000); // Refresh every 30 seconds
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchRealtimeData(),
        fetchUserAnalytics(),
        fetchSystemMetrics(),
        fetchUsers()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        setLoading(false);
      }
    }
  };

  // Normalize backend dashboard payload to the UI's expected shape
  const normalizeDashboardData = (d: any): KPIDashboardData => {
    const users = d?.users || {};
    const flights = d?.flights || {};
    const perf = d?.performance || {};
    const totalUsers = users.total || 0;
    const premiumUsers = users.premium || 0;
    const conversionRate = typeof users.conversionRate === 'number'
      ? users.conversionRate
      : (totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0);

    return {
      period: d?.period || { range: timeRange, startDate: '', endDate: '' },
      users: {
        total: totalUsers,
        active: users.active || 0,
        new: users.new || 0,
        premium: premiumUsers,
        enterprise: users.enterprise || 0,
        retention: users.retention || 0,
        growth: users.growth || 0,
        conversionRate
      },
      flights: {
        totalRoutes: flights.totalRoutes || 0,
        activeRoutes: flights.activeRoutes || 0,
        totalScans: flights.totalScans || 0,
        successfulScans: flights.successfulScans || 0,
        scanSuccessRate: flights.scanSuccessRate || 0,
        totalAlerts: (typeof flights.totalAlerts === 'number' ? flights.totalAlerts : (flights.alerts24h || 0)),
        alertsConversionRate: flights.alertsConversionRate || 0,
        avgAlertsPerRoute: (typeof flights.avgAlertsPerRoute === 'number' ? flights.avgAlertsPerRoute : (flights.avgAlertsPerActiveRoute || 0))
      },
      financial: {
        totalSavings: d?.financial?.totalSavings || 0,
        avgSavingsPerAlert: d?.financial?.avgSavingsPerAlert || 0,
        premiumRevenue: d?.financial?.premiumRevenue || 0,
        revenuePerUser: d?.financial?.revenuePerUser || 0,
        savingsToRevenueRatio: d?.financial?.savingsToRevenueRatio || 0
      },
      performance: {
        avgResponseTime: perf.avgResponseTime || 0,
        systemUptime: perf.systemUptime || 0,
        apiCallsSuccess: perf.apiCallsSuccess || 0,
        errorRate: perf.errorRate || 0,
        availability: perf.availability || 'unknown'
      },
      ai: {
        maturityScore: d?.ai?.maturityScore || 0,
        predictionAccuracy: d?.ai?.predictionAccuracy || 0,
        readyForAutonomy: d?.ai?.readyForAutonomy || false,
        riskLevel: d?.ai?.riskLevel || 'unknown'
      },
      trends: Array.isArray(d?.trends) ? d.trends : []
    };
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`/api/admin/kpis/dashboard?range=${timeRange}`);
      setDashboardData(normalizeDashboardData(response.data));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const response = await axios.get('/api/admin/kpis/realtime');
      setRealtimeData(response.data);
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    }
  };

  const fetchUserAnalytics = async () => {
    try {
      const response = await axios.get(`/api/admin/kpis/users?range=${timeRange}`);
      setUserAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const response = await axios.get(`/api/admin/kpis/system?range=${timeRange}`);
      setSystemMetrics(response.data);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const updateUserSubscription = async (userId: string, newSubscription: 'free' | 'premium' | 'enterprise') => {
    try {
      await axios.put(`/api/admin/users/${userId}/subscription`, {
        subscription_type: newSubscription
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, subscription_type: newSubscription }
          : user
      ));

      // Close modal and refresh data
      setShowUserModal(false);
      setSelectedUser(null);
      
      alert(`Abonnement mis à jour vers ${newSubscription} avec succès!`);
    } catch (error) {
      console.error('Error updating user subscription:', error);
      alert('Erreur lors de la mise à jour de l\'abonnement');
    }
  };

  const deleteUser = async (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await axios.delete(`/api/admin/users/${userToDelete}`);
      
      // Update local state
      setUsers(users.filter(user => user.id !== userToDelete));
      setShowUserModal(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setSelectedUser(null);
      
      alert('Utilisateur supprimé avec succès!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleLogout = () => {
    if (refreshInterval) clearInterval(refreshInterval);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': case 'needs-attention': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(decimals);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    subtitle?: string;
    status?: string;
    icon?: string;
  }> = ({ title, value, change, subtitle, status, icon }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {status && (
        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-2 ${getStatusColor(status)}`}>
          {status}
        </span>
      )}
    </div>
  );

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎯 KPI Dashboard Admin</h1>
            <p className="text-gray-600">Bienvenue, {user.email}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <select 
              value={timeRange} 
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Dernière heure</option>
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
            </select>
            
            {/* Refresh Button */}
            <button 
              onClick={fetchAllData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              🔄 Actualiser
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
            { id: 'adaptive', name: 'Prix Adaptatif IA', icon: '🧠' },
            { id: 'users', name: 'Utilisateurs', icon: '👥' },
            { id: 'flights', name: 'Vols & Routes', icon: '✈️' },
            { id: 'flightapi', name: 'FlightAPI Monitor', icon: '🛫' },
            { id: 'financial', name: 'Finances', icon: '💰' },
            { id: 'system', name: 'Système', icon: '🖥️' },
            { id: 'realtime', name: 'Temps Réel', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Real-time Status Bar */}
            {realtimeData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        realtimeData.system.health.score > 90 ? 'bg-green-500' :
                        realtimeData.system.health.score > 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">Système: {realtimeData.system.health.status}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      👥 {realtimeData.realtime.activeUsers} utilisateurs actifs
                    </div>
                    <div className="text-sm text-gray-600">
                      📞 {realtimeData.realtime.apiCallsPerHour} appels/h
                    </div>
                    <div className="text-sm text-gray-600">
                      🚨 {realtimeData.realtime.alertsPerHour} alertes/h
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Dernière mise à jour: {new Date(realtimeData.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}

            {/* Main KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Utilisateurs Total"
                value={formatNumber(dashboardData.users.total)}
                change={dashboardData.users.growth}
                subtitle={`${dashboardData.users.active} actifs`}
                icon="👥"
              />
              <MetricCard
                title="Routes Actives"
                value={formatNumber(dashboardData.flights.activeRoutes)}
                subtitle={`${formatNumber(dashboardData.flights.totalScans)} scans`}
                icon="✈️"
              />
              <MetricCard
                title="Économies Générées"
                value={formatCurrency(dashboardData.financial.totalSavings)}
                subtitle="Pour les utilisateurs"
                icon="💰"
              />
              <MetricCard
                title="Temps de Réponse"
                value={`${dashboardData.performance.avgResponseTime.toFixed(0)}ms`}
                status={dashboardData.performance.availability}
                icon="⚡"
              />
            </div>

            {/* Conversion & Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Conversion Premium"
                value={`${dashboardData.users.conversionRate.toFixed(1)}%`}
                subtitle={`${dashboardData.users.premium} utilisateurs premium`}
                icon="⭐"
              />
              <MetricCard
                title="Taux de Réussite Scans"
                value={`${dashboardData.flights.scanSuccessRate.toFixed(1)}%`}
                subtitle={`${formatNumber(dashboardData.flights.successfulScans)} réussis`}
                icon="🎯"
              />
              <MetricCard
                title="Score IA"
                value={`${dashboardData.ai.maturityScore}/10`}
                subtitle={`Risque: ${dashboardData.ai.riskLevel}`}
                status={dashboardData.ai.readyForAutonomy ? 'excellent' : 'needs-attention'}
                icon="🤖"
              />
            </div>

            {/* Trends Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">📈 Tendances des Performances</h3>
              <div className="space-y-4">
                {dashboardData.trends.slice(-7).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium w-20">
                        {new Date(trend.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Requêtes: {formatNumber(trend.requests)}</span>
                        <span className="text-sm text-gray-600">Erreurs: {formatNumber(trend.errors)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        trend.successRate > 90 ? 'text-green-600' :
                        trend.successRate > 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {trend.successRate.toFixed(1)}% succès
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Analytics Overview */}
            {userAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Ratio d'Engagement"
                  value={`${userAnalytics.engagement.activeUsersRatio.toFixed(1)}%`}
                  subtitle="Utilisateurs actifs"
                  icon="📊"
                />
                <MetricCard
                  title="Alertes par Utilisateur"
                  value={userAnalytics.engagement.avgAlertsPerUser.toFixed(1)}
                  subtitle="Moyenne"
                  icon="🚨"
                />
                <MetricCard
                  title="Valeur Vie Client (LTV)"
                  value={formatCurrency(userAnalytics.lifetimeValue.premiumLTV)}
                  subtitle="Premium"
                  icon="💎"
                />
              </div>
            )}

            {/* User Management Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">👥 Gestion des Utilisateurs</h3>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {users.length} utilisateur{users.length > 1 ? 's' : ''} total
                  </span>
                  <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loadingUsers ? '🔄 Actualisation...' : '🔄 Actualiser'}
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abonnement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Onboarding
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dernière connexion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          🔄 Chargement des utilisateurs...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {user.id.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.subscription_type === 'enterprise' 
                                ? 'bg-purple-100 text-purple-800'
                                : user.subscription_type === 'premium'
                                ? 'bg-gold-100 text-gold-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.subscription_type === 'enterprise' ? '👑 Enterprise' :
                               user.subscription_type === 'premium' ? '💎 Premium' : '🆓 Gratuit'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.onboardingCompleted 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.onboardingCompleted ? '✅ Terminé' : '⏳ En cours'}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {user.profileCompleteness}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleDateString('fr-FR')
                              : 'Jamais'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              ⚙️ Gérer
                            </button>
                            {user.subscription_type !== 'enterprise' && (
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer l'utilisateur"
                              >
                                🗑️ Supprimer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && systemMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Mémoire Utilisée"
                value={`${systemMetrics.resources.memory.heapUsed}MB`}
                subtitle={`/${systemMetrics.resources.memory.heapTotal}MB`}
                icon="🧠"
              />
              <MetricCard
                title="Uptime Processus"
                value={`${(systemMetrics.resources.process.uptime / 3600).toFixed(1)}h`}
                subtitle={`PID: ${systemMetrics.resources.process.pid}`}
                icon="⏱️"
              />
              <MetricCard
                title="Collections DB"
                value={formatNumber(systemMetrics.database.collections)}
                subtitle={`${systemMetrics.database.dataSize}MB données`}
                icon="🗄️"
              />
              <MetricCard
                title="Objets DB"
                value={formatNumber(systemMetrics.database.objects)}
                subtitle={`${systemMetrics.database.indexes} index`}
                icon="📋"
              />
            </div>

            {/* Performance Metrics */}
            {systemMetrics.performance.responseTime[0] && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">⚡ Performances Temps de Réponse</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemMetrics.performance.responseTime[0].avgResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">Moyenne</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {systemMetrics.performance.responseTime[0].minResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">Minimum</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {systemMetrics.performance.responseTime[0].maxResponseTime.toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">Maximum</div>
                  </div>
                </div>
              </div>
            )}

            {/* Throughput */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">📊 Débit Système</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-purple-600">
                    {systemMetrics.performance.throughput.requestsPerHour.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Requêtes par heure</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-600">
                    {formatNumber(systemMetrics.performance.throughput.totalRequests)}
                  </div>
                  <div className="text-sm text-gray-600">Total requêtes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Tab */}
        {activeTab === 'realtime' && realtimeData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Utilisateurs Actifs"
                value={realtimeData.realtime.activeUsers}
                subtitle="En temps réel"
                icon="👥"
              />
              <MetricCard
                title="Appels API/Heure"
                value={formatNumber(realtimeData.realtime.apiCallsPerHour)}
                subtitle="Dernière heure"
                icon="📞"
              />
              <MetricCard
                title="Alertes/Heure"
                value={formatNumber(realtimeData.realtime.alertsPerHour)}
                subtitle="Dernière heure"
                icon="🚨"
              />
              <MetricCard
                title="Score Santé"
                value={`${realtimeData.realtime.healthScore}/100`}
                status={realtimeData.realtime.status}
                icon="💚"
              />
            </div>

            {/* System Health Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">🖥️ État Système Détaillé</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Mémoire</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilisée:</span>
                      <span className="text-sm font-medium">{realtimeData.system.health.memory.used}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="text-sm font-medium">{realtimeData.system.health.memory.total}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Usage:</span>
                      <span className={`text-sm font-medium ${
                        realtimeData.system.health.memory.usage > 90 ? 'text-red-600' :
                        realtimeData.system.health.memory.usage > 70 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {realtimeData.system.health.memory.usage}%
                      </span>
                    </div>
                    {/* Memory Usage Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          realtimeData.system.health.memory.usage > 90 ? 'bg-red-500' :
                          realtimeData.system.health.memory.usage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(realtimeData.system.health.memory.usage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Système</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Uptime:</span>
                      <span className="text-sm font-medium">
                        {(realtimeData.system.health.uptime / 3600).toFixed(1)}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(realtimeData.system.health.status)}`}>
                        {realtimeData.system.health.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">⚡ Activité en Temps Réel</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">API Calls actifs</span>
                  </div>
                  <span className="text-sm font-medium">{realtimeData.realtime.apiCallsPerHour}/h</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Alertes générées</span>
                  </div>
                  <span className="text-sm font-medium">{realtimeData.realtime.alertsPerHour}/h</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Erreurs détectées</span>
                  </div>
                  <span className="text-sm font-medium">{realtimeData.realtime.errorsPerHour}/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adaptive Pricing Tab */}
        {activeTab === 'adaptive' && (
          <AdaptivePricingDashboard />
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <FinancialTab timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} />
        )}

        {/* Flights Tab */}
        {activeTab === 'flights' && (
          <FlightTab timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} />
        )}

        {/* FlightAPI Monitor Tab */}
        {activeTab === 'flightapi' && (
          <FlightAPIMonitor />
        )}
      </main>

      {/* User Management Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">👤 Gestion Utilisateur</h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nom</label>
                  <p className="text-lg">{selectedUser.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-lg">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Abonnement Actuel</label>
                  <p className={`text-lg font-semibold ${
                    selectedUser.subscription_type === 'enterprise' ? 'text-purple-600' :
                    selectedUser.subscription_type === 'premium' ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {selectedUser.subscription_type === 'enterprise' ? '👑 Enterprise' :
                     selectedUser.subscription_type === 'premium' ? '💎 Premium' : '🆓 Gratuit'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Onboarding</label>
                  <p className="text-lg">
                    {selectedUser.onboardingCompleted ? '✅ Terminé' : '⏳ En cours'} ({selectedUser.profileCompleteness}%)
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Membre depuis</label>
                  <p className="text-lg">{new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Dernière connexion</label>
                  <p className="text-lg">
                    {selectedUser.lastLogin 
                      ? new Date(selectedUser.lastLogin).toLocaleDateString('fr-FR')
                      : 'Jamais'
                    }
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Aéroports supplémentaires</label>
                  <p className="text-sm">
                    {selectedUser.additionalAirports.length > 0 
                      ? selectedUser.additionalAirports.join(', ')
                      : 'Aucun'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Destinations de rêve</label>
                  <p className="text-sm">
                    {selectedUser.dreamDestinations.length > 0 
                      ? `${selectedUser.dreamDestinations.length} destination(s)`
                      : 'Aucune'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Management */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-4">🔧 Gestion de l'Abonnement</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => updateUserSubscription(selectedUser.id, 'free')}
                  disabled={selectedUser.subscription_type === 'free'}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedUser.subscription_type === 'free'
                      ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🆓</div>
                    <div className="font-medium">Gratuit</div>
                    <div className="text-sm text-gray-600">Basique</div>
                  </div>
                </button>

                <button
                  onClick={() => updateUserSubscription(selectedUser.id, 'premium')}
                  disabled={selectedUser.subscription_type === 'premium'}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedUser.subscription_type === 'premium'
                      ? 'border-yellow-300 bg-yellow-100 text-yellow-700 cursor-not-allowed'
                      : 'border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-medium">Premium</div>
                    <div className="text-sm text-gray-600">Avancé</div>
                  </div>
                </button>

                <button
                  onClick={() => updateUserSubscription(selectedUser.id, 'enterprise')}
                  disabled={selectedUser.subscription_type === 'enterprise'}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedUser.subscription_type === 'enterprise'
                      ? 'border-purple-300 bg-purple-100 text-purple-700 cursor-not-allowed'
                      : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">👑</div>
                    <div className="font-medium">Enterprise</div>
                    <div className="text-sm text-gray-600">Admin</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            {selectedUser.subscription_type !== 'enterprise' && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-red-600 mb-4">⚠️ Zone Dangereuse</h4>
                <button
                  onClick={() => deleteUser(selectedUser.id)}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  🗑️ Supprimer l'utilisateur
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Cette action est irréversible. L'utilisateur et toutes ses données seront supprimés.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et toutes les données de l'utilisateur seront supprimées.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={cancelDeleteUser}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAdminDashboard;

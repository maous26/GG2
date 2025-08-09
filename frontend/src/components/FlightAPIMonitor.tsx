import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Interfaces for FlightAPI data
interface FlightAPIMetrics {
  timestamp: string;
  flightapi: {
    status: 'excellent' | 'good' | 'poor';
    totalCalls24h: number;
    successfulCalls24h: number;
    successRate: number;
    avgResponseTime: number;
    callsLastHour: number;
    errorsLastHour: number;
    totalFlightResults: number;
    activeRoutes: number;
    dealsDetected24h: number;
    healthScore: number;
  };
}

interface FlightAPITrend {
  date: string;
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  avgResponseTime: number;
  totalResults: number;
}

interface RouteStatus {
  route: string;
  tier: number;
  scanFrequency: string;
  lastScanned: string | null;
  status: 'active' | 'error';
  avgResponseTime: number;
  recentAlerts: number;
  callsLast2h: number;
  successRate: number;
}

interface ScanningStatus {
  timestamp: string;
  totalActiveRoutes: number;
  routeStatus: RouteStatus[];
  summary: {
    activeRoutes: number;
    errorRoutes: number;
    avgResponseTime: number;
    totalAlertsLast24h: number;
  };
}

interface LiveSearchResult {
  timestamp: string;
  route: string;
  responseTime: number;
  results: {
    flights: any[];
    deals: any[];
    totalFlights: number;
    totalDeals: number;
    priceRange: {
      min: number;
      max: number;
      avg: number;
    } | null;
  };
  apiStatus: 'success' | 'fallback';
}

const FlightAPIMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<FlightAPIMetrics | null>(null);
  const [trends, setTrends] = useState<FlightAPITrend[]>([]);
  const [scanningStatus, setScanningStatus] = useState<ScanningStatus | null>(null);
  const [liveSearch, setLiveSearch] = useState<LiveSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Live search form
  const [searchForm, setSearchForm] = useState({
    origin: 'CDG',
    destination: 'JFK',
    departureDate: '',
    returnDate: '',
    passengers: { adults: 1, children: 0, infants: 0 }
  });
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchTrends(),
        fetchScanningStatus()
      ]);
    } catch (error) {
      console.error('Error fetching FlightAPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/admin/flightapi/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching FlightAPI metrics:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await axios.get('/api/admin/flightapi/trends?days=7');
      setTrends(response.data.trends);
    } catch (error) {
      console.error('Error fetching FlightAPI trends:', error);
    }
  };

  const fetchScanningStatus = async () => {
    try {
      const response = await axios.get('/api/admin/flightapi/scanning-status');
      setScanningStatus(response.data);
    } catch (error) {
      console.error('Error fetching scanning status:', error);
    }
  };

  const performLiveSearch = async () => {
    setSearchLoading(true);
    try {
      const response = await axios.post('/api/admin/flightapi/live-search', searchForm);
      setLiveSearch(response.data);
    } catch (error) {
      console.error('Error performing live search:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'excellent': return '#22c55e';
      case 'good': return '#eab308';
      case 'poor': return '#ef4444';
      case 'active': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading FlightAPI Monitor...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
          FlightAPI Real-Time Monitor
        </h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>
          Live monitoring of FlightAPI performance, route scanning, and flight data
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e2e8f0', 
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '8px 8px 0 0',
        padding: '0 16px'
      }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'routes', label: '🛣️ Route Scanning' },
          { id: 'live', label: '🔍 Live Search' },
          { id: 'trends', label: '📈 Trends' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === tab.id ? '#3b82f6' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Status Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
              🔥 API Status
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(metrics.flightapi.status),
                marginRight: '8px'
              }} />
              <span style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {metrics.flightapi.status}
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Health Score: <strong>{metrics.flightapi.healthScore}%</strong>
            </div>
          </div>

          {/* 24h Stats */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
              📊 24h Statistics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {metrics.flightapi.totalCalls24h}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Total Calls</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                  {metrics.flightapi.successRate}%
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Success Rate</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {metrics.flightapi.avgResponseTime}ms
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Avg Response</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {metrics.flightapi.dealsDetected24h}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Deals Found</div>
              </div>
            </div>
          </div>

          {/* Hourly Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
              ⚡ Last Hour
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {metrics.flightapi.callsLastHour}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>API Calls</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                  {metrics.flightapi.errorsLastHour}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Errors</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                  {metrics.flightapi.activeRoutes}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Active Routes</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#06b6d4' }}>
                  {metrics.flightapi.totalFlightResults}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Flight Results</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === 'routes' && scanningStatus && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>
              Route Scanning Status
            </h3>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Last updated: {formatTime(scanningStatus.timestamp)}
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                {scanningStatus.summary.activeRoutes}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Active Routes</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {scanningStatus.summary.errorRoutes}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Error Routes</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {scanningStatus.summary.avgResponseTime}ms
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Avg Response</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {scanningStatus.summary.totalAlertsLast24h}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Alerts (24h)</div>
            </div>
          </div>

          {/* Routes Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Route</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Tier</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Frequency</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Last Scan</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Success Rate</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Alerts</th>
                </tr>
              </thead>
              <tbody>
                {scanningStatus.routeStatus.slice(0, 20).map((route, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <strong>{route.route}</strong>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      Tier {route.tier}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {route.scanFrequency}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: route.status === 'active' ? '#dcfce7' : '#fecaca',
                        color: route.status === 'active' ? '#166534' : '#991b1b',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {route.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {formatTime(route.lastScanned)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {route.successRate}%
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {route.recentAlerts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Search Tab */}
      {activeTab === 'live' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Search Form */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
            height: 'fit-content'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
              🔍 Live FlightAPI Search
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Origin Airport
              </label>
              <input
                type="text"
                value={searchForm.origin}
                onChange={(e) => setSearchForm({ ...searchForm, origin: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="e.g., CDG, JFK, LAX"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Destination Airport
              </label>
              <input
                type="text"
                value={searchForm.destination}
                onChange={(e) => setSearchForm({ ...searchForm, destination: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="e.g., CDG, JFK, LAX"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Departure Date
              </label>
              <input
                type="date"
                value={searchForm.departureDate}
                onChange={(e) => setSearchForm({ ...searchForm, departureDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              onClick={performLiveSearch}
              disabled={searchLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: searchLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: searchLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {searchLoading ? 'Searching...' : 'Search Flights'}
            </button>
          </div>

          {/* Search Results */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
              Search Results
            </h3>
            
            {liveSearch ? (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '20px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {liveSearch.route}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      Response Time: {liveSearch.responseTime}ms
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: liveSearch.apiStatus === 'success' ? '#dcfce7' : '#fef3c7',
                    color: liveSearch.apiStatus === 'success' ? '#166534' : '#92400e',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {liveSearch.apiStatus === 'success' ? 'Real API' : 'Fallback'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {liveSearch.results.totalFlights}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Flights Found</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                      {liveSearch.results.totalDeals}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Deals Found</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                      ${liveSearch.results.priceRange?.avg || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Avg Price</div>
                  </div>
                </div>

                {liveSearch.results.priceRange && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Price Range</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span>Min: <strong>${liveSearch.results.priceRange.min}</strong></span>
                      <span>Avg: <strong>${liveSearch.results.priceRange.avg}</strong></span>
                      <span>Max: <strong>${liveSearch.results.priceRange.max}</strong></span>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Search performed at: {new Date(liveSearch.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#64748b', 
                padding: '60px 20px',
                fontSize: '16px'
              }}>
                Perform a search to see real-time FlightAPI results
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
            FlightAPI Performance Trends (7 Days)
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Total Calls</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Successful</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Success Rate</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Avg Response</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>Results</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {new Date(trend.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {trend.totalCalls}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {trend.successfulCalls}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{
                        color: trend.successRate >= 90 ? '#22c55e' : trend.successRate >= 70 ? '#f59e0b' : '#ef4444'
                      }}>
                        {trend.successRate}%
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {trend.avgResponseTime}ms
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {trend.totalResults}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightAPIMonitor;
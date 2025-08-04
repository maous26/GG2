import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MLMaturityGauge from '../components/MLMaturityGauge';

interface UsageData {
  date: string;
  calls: number;
  alerts: number;
}

interface Route {
  id: string;
  origin: string;
  destination: string;
  tier: number;
  scan_frequency_hours: number;
  total_alerts: number;
  avg_discount: number;
  last_scan: string;
}

interface User {
  id: string;
  email: string;
  subscription_type: 'free' | 'premium' | 'enterprise';
  departure_airports: string[];
  alerts_received: number;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.subscription_type !== 'enterprise') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    
    // Set authorization header for all requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [usageRes, routesRes, usersRes] = await Promise.all([
        axios.get('/api/admin/api-usage'),
        axios.get('/api/admin/routes'),
        axios.get('/api/admin/users')
      ]);

      setUsageData(usageRes.data);
      setRoutes(routesRes.data);
      setUsers(usersRes.data);
      setLoading(false);
  } catch (error) {
      console.error('Error fetching admin data:', error);
      // If unauthorized, redirect to login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setLoading(false);
      }
  }
};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Bienvenue, {user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Déconnexion
        </button>
      </div>
      
      {/* Jauge de Maturité ML - Section principale */}
      <div className="mb-8">
        <MLMaturityGauge />
      </div>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Routes Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Routes</h2>
              <div className="space-y-4">
                {routes.map(route => (
                  <div key={route.id} className="border-b pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{route.origin} → {route.destination}</p>
                        <p className="text-sm text-gray-600">Tier {route.tier}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Scan: {route.scan_frequency_hours}h</p>
                        <p className="text-sm">Alerts: {route.total_alerts}</p>
                        <p className="text-sm">Avg Discount: {route.avg_discount}%</p>
                        <p className="text-xs text-gray-500">
                          Last Scan: {new Date(route.last_scan).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Users Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Users</h2>
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="border-b pb-4">
                    <p className="font-medium">{user.email}</p>
                    <p className="text-sm text-gray-600">
                      {user.subscription_type} - {user.alerts_received} alerts
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* API Usage Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">API Usage</h2>
              <div className="space-y-4">
                {usageData.map((data, index) => (
                  <div key={index} className="border-b pb-4">
                    <p className="font-medium">{data.date}</p>
                    <p className="text-sm text-gray-600">
                      Calls: {data.calls} | Alerts: {data.alerts}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
  AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,
  USERS: `${API_BASE_URL}/api/users`,
  ALERTS: `${API_BASE_URL}/api/alerts`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,
  ADMIN_KPIS: `${API_BASE_URL}/api/admin/kpis`,
  SCANNING: `${API_BASE_URL}/api/scanning`,
  HEALTH: `${API_BASE_URL}/health`,
};

export default API_ENDPOINTS; 
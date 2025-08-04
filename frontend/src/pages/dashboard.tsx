import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  origin: string;
  destination: string;
  price: number;
  discount: number;
  departureDate: Date;
  returnDate: Date;
  airline: string;
}

interface UserPreferences {
  departureAirports: string[];
  minDiscount: number;
  maxPrice: number;
  destinations: string[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    departureAirports: ['CDG'],
    minDiscount: 30,
    maxPrice: 1000,
    destinations: []
  });

  useEffect(() => {
    // Here you would fetch user data and alerts from your API
    // For now, using mock data
    const mockAlerts: Alert[] = [
      {
        id: '1',
        origin: 'CDG',
        destination: 'JFK',
        price: 299,
        discount: 65,
        departureDate: new Date('2024-05-15'),
        returnDate: new Date('2024-05-22'),
        airline: 'Air France'
      },
      {
        id: '2',
        origin: 'CDG',
        destination: 'BKK',
        price: 449,
        discount: 55,
        departureDate: new Date('2024-06-10'),
        returnDate: new Date('2024-06-24'),
        airline: 'Thai Airways'
      }
    ];

    setAlerts(mockAlerts);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">🌍 GlobeGenius</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                Admin
              </button>
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Alerts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vos Alertes Prix 🔥
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {alert.origin} → {alert.destination}
                    </h3>
                    <p className="text-gray-600">{alert.airline}</p>
                  </div>
                  <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                    -{alert.discount}%
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-indigo-600">
                    {alert.price}€
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(alert.departureDate).toLocaleDateString('fr-FR')} - {new Date(alert.returnDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
                  Réserver
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vos Préférences ⚙️
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aéroports de départ
                </label>
                <select
                  value={preferences.departureAirports[0]}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    departureAirports: [e.target.value]
                  }))}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="CDG">Paris CDG</option>
                  <option value="ORY">Paris Orly</option>
                  <option value="NCE">Nice</option>
                  <option value="MRS">Marseille</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Réduction minimum
                </label>
                <select
                  value={preferences.minDiscount}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    minDiscount: parseInt(e.target.value)
                  }))}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="30">30%</option>
                  <option value="40">40%</option>
                  <option value="50">50%</option>
                  <option value="60">60%</option>
                </select>
              </div>
            </div>
            <button className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
              Sauvegarder les préférences
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
  
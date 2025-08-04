import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Types for user authentication (only for admin)
type UserType = 'admin' | 'user' | null;

interface User {
  id: string;
  email: string;
  type: UserType;
  name: string;
  subscription_type: 'free' | 'premium' | 'enterprise';
}

// API Response Types
interface ApiUser {
  id: string;
  email: string;
  subscription_type: 'free' | 'premium' | 'enterprise';
  departure_airports: string[];
  alerts_received: number;
  created_at: string;
}

interface ApiRoute {
  _id: string;
  origin: string;
  destination: string;
  tier: number;
  scanFrequencyHours: number;
  isActive: boolean;
  lastScan: string;
  performance: {
    totalAlerts: number;
    avgDiscount: number;
    clickRate: number;
    conversionRate: number;
  };
}

interface ApiStats {
  overview: {
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    totalAlerts: number;
    totalRoutes: number;
    activeRoutes: number;
    todayAlerts: number;
    todayApiCalls: number;
    totalSavings: number;
  };
  recentUsers: {
    email: string;
    subscription_type: string;
    created_at: string;
    alerts_received: number;
  }[];
  topRoutes: {
    origin: string;
    destination: string;
    tier: number;
    totalAlerts: number;
    avgDiscount: number;
    lastScan: string;
  }[];
}

interface ApiUsage {
  date: string;
  calls: number;
  alerts: number;
  successfulCalls: number;
}

// PremiumOnboarding Component (Processus complet d'inscription Premium)
const PremiumOnboarding: React.FC<{ onBack: () => void; onSuccess: () => void }> = ({ onBack, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<'basic' | 'password' | 'airports' | 'destinations' | 'travel' | 'preferences' | 'success'>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  
  // États pour collecter les données
  const [userData, setUserData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    additionalAirports: [] as string[],
    dreamDestinations: [] as {destination: string, airportCode: string, priority: 'high' | 'medium' | 'low'}[],
    customDestination: '', // Nouveau champ pour destination personnalisée
    travelerType: '' as 'business' | 'leisure' | 'family' | 'backpacker' | 'luxury' | 'adventure' | '',
    travelPeriod: {
      flexible: true,
      specificPeriods: [] as {type: 'month' | 'season', value: string, name: string}[]
    },
    notificationStyle: 'friendly' as 'urgent' | 'friendly' | 'professional' | 'casual',
    budgetRange: { min: 100, max: 1000, currency: 'EUR' }
  });

  // Données des aéroports et destinations
  const provincialAirports = {
    'Sud-Est': [
      { code: 'NCE', name: 'Nice Côte d\'Azur' },
      { code: 'MRS', name: 'Marseille Provence' },
      { code: 'LYS', name: 'Lyon Saint-Exupéry' }
    ],
    'Sud-Ouest': [
      { code: 'TLS', name: 'Toulouse Blagnac' },
      { code: 'BOD', name: 'Bordeaux Mérignac' },
      { code: 'MPL', name: 'Montpellier' }
    ],
    'Ouest': [
      { code: 'NTE', name: 'Nantes Atlantique' },
      { code: 'RNS', name: 'Rennes Saint-Jacques' }
    ],
    'Nord/Est': [
      { code: 'LIL', name: 'Lille Lesquin' },
      { code: 'SXB', name: 'Strasbourg' }
    ]
  };

  const popularDestinations = [
    { destination: 'Londres', airportCode: 'LHR', region: 'Europe' },
    { destination: 'New York', airportCode: 'JFK', region: 'Amérique du Nord' },
    { destination: 'Tokyo', airportCode: 'NRT', region: 'Asie' },
    { destination: 'Bali', airportCode: 'DPS', region: 'Asie' },
    { destination: 'Barcelone', airportCode: 'BCN', region: 'Europe' },
    { destination: 'Bangkok', airportCode: 'BKK', region: 'Asie' },
    { destination: 'Rome', airportCode: 'FCO', region: 'Europe' },
    { destination: 'Miami', airportCode: 'MIA', region: 'Amérique du Nord' }
  ];

  // Options pour périodes spécifiques
  const timeOptions = {
    months: [
      { value: 'janvier', name: 'Janvier' },
      { value: 'février', name: 'Février' },
      { value: 'mars', name: 'Mars' },
      { value: 'avril', name: 'Avril' },
      { value: 'mai', name: 'Mai' },
      { value: 'juin', name: 'Juin' },
      { value: 'juillet', name: 'Juillet' },
      { value: 'août', name: 'Août' },
      { value: 'septembre', name: 'Septembre' },
      { value: 'octobre', name: 'Octobre' },
      { value: 'novembre', name: 'Novembre' },
      { value: 'décembre', name: 'Décembre' }
    ],
    seasons: [
      { value: 'printemps', name: '🌸 Printemps (Mars-Mai)' },
      { value: 'été', name: '☀️ Été (Juin-Août)' },
      { value: 'automne', name: '🍂 Automne (Sept-Nov)' },
      { value: 'hiver', name: '❄️ Hiver (Déc-Fév)' }
    ]
  };

  const addCustomDestination = () => {
    if (userData.customDestination.trim()) {
      const newDestination = {
        destination: userData.customDestination.trim(),
        airportCode: '', // Sera déterminé plus tard ou laissé vide
        priority: 'medium' as const
      };
      setUserData({
        ...userData,
        dreamDestinations: [...userData.dreamDestinations, newDestination],
        customDestination: ''
      });
    }
  };

  const addTimePeriod = (type: 'month' | 'season', value: string, name: string) => {
    const newPeriod = { type, value, name };
    if (!userData.travelPeriod.specificPeriods.some(p => p.type === type && p.value === value)) {
      setUserData({
        ...userData,
        travelPeriod: {
          ...userData.travelPeriod,
          specificPeriods: [...userData.travelPeriod.specificPeriods, newPeriod]
        }
      });
    }
  };

  const removeTimePeriod = (index: number) => {
    setUserData({
      ...userData,
      travelPeriod: {
        ...userData.travelPeriod,
        specificPeriods: userData.travelPeriod.specificPeriods.filter((_, i) => i !== index)
      }
    });
  };

  const handleFinalSubmit = async () => {
    setIsProcessing(true);
    
    try {
      // 1. Créer l'utilisateur premium
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userData.email, 
          password: userData.password,
          subscription_type: 'premium'
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Erreur lors de la création du compte');
      }

      const { user } = await registerResponse.json();

      // 2. Mettre à jour les préférences
      const preferencesResponse = await fetch('/api/auth/users/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          preferences: {
            additionalAirports: userData.additionalAirports,
            dreamDestinations: userData.dreamDestinations,
            travelerType: userData.travelerType,
            travelPeriod: userData.travelPeriod,
            notificationStyle: userData.notificationStyle,
            budgetRange: userData.budgetRange
          },
          onboardingCompleted: true
        })
      });

      if (preferencesResponse.ok) {
        // Stocker les informations de connexion
        const { token } = await registerResponse.json();
        const updatedUser = await preferencesResponse.json();
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          ...updatedUser.user,
          type: 'premium'
        }));
        
        setCurrentStep('success');
        setTimeout(() => {
          // Rediriger vers le dashboard premium
          window.location.href = '/dashboard';
        }, 3000);
      } else {
        setMessage('Compte créé mais erreur lors de la sauvegarde des préférences');
      }
    } catch (error) {
      setMessage('Erreur lors de la création du compte premium');
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'system-ui, sans-serif', padding: '2rem' },
    card: { backgroundColor: 'white', color: '#1e293b', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' as const },
    backButton: { position: 'absolute' as const, top: '1rem', left: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6366f1' },
    title: { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' as const },
    subtitle: { fontSize: '0.9rem', color: '#64748b', textAlign: 'center' as const, marginBottom: '2rem' },
    button: { width: '100%', padding: '12px 16px', backgroundColor: '#ff6b35', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' },
    secondaryButton: { width: '100%', padding: '10px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' },
    input: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '1rem' },
    checkboxGroup: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' },
    checkbox: { display: 'flex', alignItems: 'center', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' },
    progressBar: { width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', marginBottom: '2rem', overflow: 'hidden' }
  };

  const getStepProgress = () => {
    const steps = ['basic', 'password', 'airports', 'destinations', 'travel', 'preferences'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  // Étape Succès
  if (currentStep === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🎉</div>
            <h1 style={styles.title}>Bienvenue dans Premium !</h1>
            <div style={{backgroundColor: '#dcfce7', color: '#16a34a', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
              Votre profil Premium est configuré ! Vous allez recevoir des alertes personnalisées sous 24h.
            </div>
            <div style={{backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px'}}>
              <strong>Vos aéroports :</strong> CDG, Orly, Beauvais {userData.additionalAirports.length > 0 && `+ ${userData.additionalAirports.join(', ')}`}<br/>
              <strong>Destinations surveillées :</strong> {userData.dreamDestinations.map(d => d.destination).join(', ') || 'Toutes destinations'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Étape 1: Informations de base
  if (currentStep === 'basic') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={onBack}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>🌟 Inscription Premium</h1>
          <p style={styles.subtitle}>Commençons par vos informations de base</p>
          
          <input 
            type="text" 
            placeholder="Votre nom complet" 
            style={styles.input}
            value={userData.name}
            onChange={(e) => setUserData({...userData, name: e.target.value})}
          />
          <input 
            type="email" 
            placeholder="Votre email" 
            style={styles.input}
            value={userData.email}
            onChange={(e) => setUserData({...userData, email: e.target.value})}
          />
          
          <button 
            style={styles.button}
            onClick={() => setCurrentStep('password')}
            disabled={!userData.email || !userData.name}
          >
            Continuer → Mot de passe
          </button>
        </div>
      </div>
    );
  }

  // Étape 2: Création mot de passe
  if (currentStep === 'password') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={() => setCurrentStep('basic')}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>🔐 Création de votre mot de passe</h1>
          <p style={styles.subtitle}>Choisissez un mot de passe sécurisé pour accéder à votre dashboard</p>
          
          <input 
            type="password" 
            placeholder="Votre mot de passe" 
            style={styles.input}
            value={userData.password}
            onChange={(e) => setUserData({...userData, password: e.target.value})}
          />
          
          <input 
            type="password" 
            placeholder="Confirmez votre mot de passe" 
            style={styles.input}
            value={userData.confirmPassword}
            onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})}
          />

          {/* Indicateur de force du mot de passe */}
          <div style={{marginBottom: '1rem'}}>
            <div style={{fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem'}}>
              Force du mot de passe:
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, (userData.password.length / 8) * 100)}%`,
                height: '100%',
                backgroundColor: userData.password.length < 6 ? '#ef4444' : userData.password.length < 8 ? '#f59e0b' : '#10b981',
                transition: 'all 0.3s'
              }}></div>
            </div>
            <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '0.3rem'}}>
              {userData.password.length < 6 ? 'Trop court' : userData.password.length < 8 ? 'Moyen' : 'Fort'}
            </div>
          </div>

          {/* Messages d'erreur */}
          {userData.password && userData.confirmPassword && userData.password !== userData.confirmPassword && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              ⚠️ Les mots de passe ne correspondent pas
            </div>
          )}

          {/* Exigences du mot de passe */}
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h4 style={{margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0369a1'}}>
              Exigences du mot de passe:
            </h4>
            <div style={{fontSize: '0.8rem', color: '#374151'}}>
              <div style={{color: userData.password.length >= 8 ? '#16a34a' : '#6b7280'}}>
                {userData.password.length >= 8 ? '✓' : '○'} Au moins 8 caractères
              </div>
              <div style={{color: /[A-Z]/.test(userData.password) ? '#16a34a' : '#6b7280'}}>
                {/[A-Z]/.test(userData.password) ? '✓' : '○'} Une majuscule
              </div>
              <div style={{color: /[0-9]/.test(userData.password) ? '#16a34a' : '#6b7280'}}>
                {/[0-9]/.test(userData.password) ? '✓' : '○'} Un chiffre
              </div>
            </div>
          </div>
          
          <button 
            style={styles.button}
            onClick={() => setCurrentStep('airports')}
            disabled={!userData.password || !userData.confirmPassword || userData.password !== userData.confirmPassword || userData.password.length < 8}
          >
            Continuer → Aéroports
          </button>
        </div>
      </div>
    );
  }

  // Étape 3: Aéroports additionnels
  if (currentStep === 'airports') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={() => setCurrentStep('password')}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>✈️ Aéroports de départ</h1>
          <p style={styles.subtitle}>
            <strong>Inclus par défaut :</strong> CDG, Orly, Beauvais<br/>
            Choisissez des aéroports de province additionnels (optionnel)
          </p>
          
          {Object.entries(provincialAirports).map(([region, airports]) => (
            <div key={region}>
              <h3 style={{marginBottom: '0.5rem', fontSize: '1rem', color: '#475569'}}>{region}</h3>
              <div style={styles.checkboxGroup}>
                {airports.map((airport) => (
                  <label key={airport.code} style={styles.checkbox}>
                    <input 
                      type="checkbox" 
                      checked={userData.additionalAirports.includes(airport.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserData({...userData, additionalAirports: [...userData.additionalAirports, airport.code]});
                        } else {
                          setUserData({...userData, additionalAirports: userData.additionalAirports.filter(c => c !== airport.code)});
                        }
                      }}
                      style={{marginRight: '0.5rem'}}
                    />
                    <span style={{fontSize: '0.9rem'}}>{airport.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          <button style={styles.button} onClick={() => setCurrentStep('destinations')}>
            Continuer → Destinations
          </button>
          <button style={styles.secondaryButton} onClick={() => setCurrentStep('destinations')}>
            Passer cette étape
          </button>
        </div>
      </div>
    );
  }

  // Étape 4: Destinations de rêve
  if (currentStep === 'destinations') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={() => setCurrentStep('airports')}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>🌍 Destinations de rêve</h1>
          <p style={styles.subtitle}>Sélectionnez vos destinations prioritaires pour des alertes ciblées</p>
          
          <div style={styles.checkboxGroup}>
            {popularDestinations.map((dest) => (
              <label key={dest.destination} style={styles.checkbox}>
                <input 
                  type="checkbox" 
                  checked={userData.dreamDestinations.some(d => d.destination === dest.destination)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setUserData({
                        ...userData, 
                        dreamDestinations: [
                          ...userData.dreamDestinations, 
                          {destination: dest.destination, airportCode: dest.airportCode, priority: 'medium'}
                        ]
                      });
                    } else {
                      setUserData({
                        ...userData, 
                        dreamDestinations: userData.dreamDestinations.filter(d => d.destination !== dest.destination)
                      });
                    }
                  }}
                  style={{marginRight: '0.5rem'}}
                />
                <span style={{fontSize: '0.9rem'}}>{dest.destination}</span>
              </label>
            ))}
          </div>

          {/* Champ libre pour destination personnalisée */}
          <div style={{marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px'}}>
            <h3 style={{marginBottom: '1rem', fontSize: '1.1rem', color: '#374151'}}>✈️ Autre destination ?</h3>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'flex-end'}}>
              <div style={{flex: 1}}>
                <input 
                  type="text" 
                  placeholder="Ex: Dubaï, Istanbul, São Paulo..."
                  value={userData.customDestination}
                  onChange={(e) => setUserData({...userData, customDestination: e.target.value})}
                  style={{...styles.input, marginBottom: 0}}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCustomDestination();
                    }
                  }}
                />
              </div>
              <button 
                type="button"
                onClick={addCustomDestination}
                disabled={!userData.customDestination.trim()}
                style={{
                  padding: '12px 16px',
                  backgroundColor: userData.customDestination.trim() ? '#10b981' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: userData.customDestination.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.9rem'
                }}
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Destinations sélectionnées */}
          {userData.dreamDestinations.length > 0 && (
            <div style={{marginTop: '1.5rem'}}>
              <h4 style={{marginBottom: '1rem', color: '#374151'}}>📍 Vos destinations sélectionnées:</h4>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                {userData.dreamDestinations.map((dest, index) => (
                  <span 
                    key={index}
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {dest.destination}
                    <button
                      onClick={() => setUserData({
                        ...userData,
                        dreamDestinations: userData.dreamDestinations.filter((_, i) => i !== index)
                      })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <button style={styles.button} onClick={() => setCurrentStep('travel')}>
            Continuer → Préférences de voyage
          </button>
        </div>
      </div>
    );
  }

  // Étape 5: Préférences de voyage
  if (currentStep === 'travel') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={() => setCurrentStep('destinations')}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>🧳 Profil voyageur</h1>
          <p style={styles.subtitle}>Aidez-nous à personnaliser vos alertes</p>
          
          <div style={{marginBottom: '2rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Type de voyageur</h3>
            <div style={styles.checkboxGroup}>
              {[
                {value: 'leisure', label: '🏖️ Loisirs/Vacances'},
                {value: 'business', label: '💼 Affaires'},
                {value: 'family', label: '👨‍👩‍👧‍👦 Famille'},
                {value: 'backpacker', label: '🎒 Routard'},
                {value: 'luxury', label: '✨ Luxe'},
                {value: 'adventure', label: '🏔️ Aventure'}
              ].map((type) => (
                <label key={type.value} style={styles.checkbox}>
                  <input 
                    type="radio" 
                    name="travelerType"
                    value={type.value}
                    checked={userData.travelerType === type.value}
                    onChange={(e) => setUserData({...userData, travelerType: e.target.value as any})}
                    style={{marginRight: '0.5rem'}}
                  />
                  <span style={{fontSize: '0.9rem'}}>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Période de voyage</h3>
            <label style={styles.checkbox}>
              <input 
                type="radio" 
                name="travelPeriod"
                checked={userData.travelPeriod.flexible}
                onChange={() => setUserData({...userData, travelPeriod: {...userData.travelPeriod, flexible: true, specificPeriods: []}})}
                style={{marginRight: '0.5rem'}}
              />
              <span>🗓️ Flexible - N'importe quand dans l'année</span>
            </label>
            <label style={styles.checkbox}>
              <input 
                type="radio" 
                name="travelPeriod"
                checked={!userData.travelPeriod.flexible}
                onChange={() => setUserData({...userData, travelPeriod: {...userData.travelPeriod, flexible: false}})}
                style={{marginRight: '0.5rem'}}
              />
              <span>📅 Périodes spécifiques</span>
            </label>

            {/* Sélection de périodes spécifiques */}
            {!userData.travelPeriod.flexible && (
              <div style={{marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
                <h4 style={{marginBottom: '1rem', color: '#0369a1'}}>🗓️ Choisissez vos périodes de voyage</h4>
                
                {/* Sélection par saisons */}
                <div style={{marginBottom: '2rem'}}>
                  <h5 style={{marginBottom: '0.5rem', fontSize: '1rem', color: '#374151'}}>Saisons</h5>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem'}}>
                    {timeOptions.seasons.map((season) => (
                      <button
                        key={season.value}
                        type="button"
                        onClick={() => addTimePeriod('season', season.value, season.name)}
                        disabled={userData.travelPeriod.specificPeriods.some(p => p.type === 'season' && p.value === season.value)}
                        style={{
                          padding: '0.75rem',
                          border: userData.travelPeriod.specificPeriods.some(p => p.type === 'season' && p.value === season.value) ? '2px solid #10b981' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: userData.travelPeriod.specificPeriods.some(p => p.type === 'season' && p.value === season.value) ? 'default' : 'pointer',
                          backgroundColor: userData.travelPeriod.specificPeriods.some(p => p.type === 'season' && p.value === season.value) ? '#dcfce7' : 'white',
                          fontSize: '0.9rem'
                        }}
                      >
                        {season.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sélection par mois */}
                <div style={{marginBottom: '1rem'}}>
                  <h5 style={{marginBottom: '0.5rem', fontSize: '1rem', color: '#374151'}}>Mois spécifiques</h5>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem'}}>
                    {timeOptions.months.map((month) => (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => addTimePeriod('month', month.value, month.name)}
                        disabled={userData.travelPeriod.specificPeriods.some(p => p.type === 'month' && p.value === month.value)}
                        style={{
                          padding: '0.5rem',
                          border: userData.travelPeriod.specificPeriods.some(p => p.type === 'month' && p.value === month.value) ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: userData.travelPeriod.specificPeriods.some(p => p.type === 'month' && p.value === month.value) ? 'default' : 'pointer',
                          backgroundColor: userData.travelPeriod.specificPeriods.some(p => p.type === 'month' && p.value === month.value) ? '#dbeafe' : 'white',
                          fontSize: '0.8rem'
                        }}
                      >
                        {month.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Périodes sélectionnées */}
                {userData.travelPeriod.specificPeriods.length > 0 && (
                  <div style={{marginTop: '1rem'}}>
                    <h5 style={{marginBottom: '0.5rem', fontSize: '1rem', color: '#374151'}}>Vos périodes sélectionnées:</h5>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                      {userData.travelPeriod.specificPeriods.map((period, index) => (
                        <span 
                          key={index}
                          style={{
                            backgroundColor: period.type === 'season' ? '#dcfce7' : '#dbeafe',
                            color: period.type === 'season' ? '#16a34a' : '#1e40af',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {period.name}
                          <button
                            onClick={() => removeTimePeriod(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: period.type === 'season' ? '#16a34a' : '#1e40af',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              padding: 0
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button style={styles.button} onClick={() => setCurrentStep('preferences')}>
            Continuer → Finaliser
          </button>
        </div>
      </div>
    );
  }

  // Étape 6: Préférences finales
  if (currentStep === 'preferences') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backButton} onClick={() => setCurrentStep('travel')}>←</button>
          <div style={styles.progressBar}>
            <div style={{width: `${getStepProgress()}%`, height: '100%', backgroundColor: '#ff6b35', transition: 'width 0.3s'}}></div>
          </div>
          <h1 style={styles.title}>🎯 Préférences finales</h1>
          <p style={styles.subtitle}>Derniers réglages pour une expérience optimale</p>
          
          <div style={{marginBottom: '2rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Style de notifications</h3>
            <div style={styles.checkboxGroup}>
              {[
                {value: 'friendly', label: '😊 Amical et décontracté'},
                {value: 'professional', label: '💼 Professionnel'},
                {value: 'urgent', label: '🚨 Urgent et direct'},
                {value: 'casual', label: '😎 Décontracté'}
              ].map((style) => (
                <label key={style.value} style={styles.checkbox}>
                  <input 
                    type="radio" 
                    name="notificationStyle"
                    value={style.value}
                    checked={userData.notificationStyle === style.value}
                    onChange={(e) => setUserData({...userData, notificationStyle: e.target.value as any})}
                    style={{marginRight: '0.5rem'}}
                  />
                  <span style={{fontSize: '0.9rem'}}>{style.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{marginBottom: '2rem'}}>
            <h3 style={{marginBottom: '1rem'}}>Budget indicatif par voyage</h3>
            <select 
              value={`${userData.budgetRange.min}-${userData.budgetRange.max}`}
              onChange={(e) => {
                const [min, max] = e.target.value.split('-').map(Number);
                setUserData({...userData, budgetRange: {min, max, currency: 'EUR'}});
              }}
              style={styles.input}
            >
              <option value="100-500">100€ - 500€ (Budget serré)</option>
              <option value="500-1000">500€ - 1000€ (Moyen)</option>
              <option value="1000-2000">1000€ - 2000€ (Confortable)</option>
              <option value="2000-5000">2000€ - 5000€ (Premium)</option>
              <option value="5000-10000">5000€+ (Luxe)</option>
            </select>
          </div>

          {message && (
            <div style={{backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem'}}>
              {message}
            </div>
          )}
          
          <button 
            style={styles.button}
            onClick={handleFinalSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? '🚀 Création en cours...' : '✅ Activer mon compte Premium'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Admin Login Component (hidden, accessible via secret URL)
const AdminLogin: React.FC<{ onLogin: (user: User) => void; onBack: () => void }> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('admin@globegenius.app');
  const [password, setPassword] = useState('GG2024Admin!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user.subscription_type === 'enterprise') {
          // Stocker le token et l'utilisateur dans localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify({
            id: data.user.id || data.user._id || 'admin-id',
            email: data.user.email,
            type: 'admin',
            name: 'Administrateur',
            subscription_type: 'enterprise'
          }));
          onLogin({
            id: data.user.id || data.user._id || 'admin-id',
            email: data.user.email,
            type: 'admin',
            name: 'Administrateur',
            subscription_type: 'enterprise'
          });
        } else {
          setError('Accès administrateur requis');
        }
      } else {
        setError('Identifiants administrateur incorrects');
      }
    } catch (error) {
      setError('Erreur de connexion au serveur');
    }

    setIsLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        color: '#1e293b',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={onBack}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6366f1'
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🛠️ Admin GlobeGenius
          </h1>
          <p style={{ color: '#64748b' }}>Accès administrateur</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Email Administrateur
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@globegenius.app"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Mot de passe Admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Connexion...' : 'Accès Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Note: AdminDashboard is now imported from ./pages/AdminDashboard

// AdminDashboard avec Jauge ML intégrée
const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mlMaturity, setMlMaturity] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filterTier, setFilterTier] = useState<number>(0);

  const fetchData = async () => {
    try {
      const [statsRes, routesRes, usersRes, mlRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/routes'),
        fetch('/api/admin/users'),
        fetch('/api/admin/ml-maturity')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (routesRes.ok) setRoutes(await routesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (mlRes.ok) setMlMaturity(await mlRes.json());

      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check auth first
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    // Appel réel des endpoints admin, log des données réelles
    fetchData();
    
    // Log des données réelles à chaque rafraîchissement
    const interval = setInterval(() => {
      fetchData();
      setTimeout(() => {
        console.log('Admin stats:', stats);
        console.log('Admin routes:', routes);
        console.log('Admin users:', users);
        console.log('ML Maturity:', mlMaturity);
      }, 1000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Log initial après premier fetch
    if (!loading) {
      console.log('Admin stats:', stats);
      console.log('Admin routes:', routes);
      console.log('Admin users:', users);
      console.log('ML Maturity:', mlMaturity);
    }
  }, [loading, stats, routes, users, mlMaturity]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        color: '#64748b'
      }}>
        🔄 Chargement des données admin...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>🎛️ Console d'Administration</h1>
              <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                GlobeGenius Admin • Dernière MAJ: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={fetchData}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Actualiser
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* ML Maturity Gauge - Section proéminente */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          border: '3px solid #f59e0b'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#d97706', marginBottom: '1.5rem', textAlign: 'center' }}>
            🧠 Machine Learning Maturity Gauge
          </h2>
          
          {mlMaturity ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '2rem',
              alignItems: 'center'
            }}>
              {/* Gauge circulaire */}
              <div style={{ 
                position: 'relative',
                width: '150px',
                height: '150px'
              }}>
                <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="75"
                    cy="75"
                    r="60"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="75"
                    cy="75"
                    r="60"
                    stroke={mlMaturity.maturityScore > 70 ? '#10b981' : mlMaturity.maturityScore > 40 ? '#f59e0b' : '#dc2626'}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - mlMaturity.maturityScore / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {Math.round(mlMaturity.maturityScore)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Maturité</div>
                </div>
              </div>

              {/* Détails des métriques */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>🎯 Précision Prédiction</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {Math.round((mlMaturity.predictionAccuracy.dealDetection + mlMaturity.predictionAccuracy.priceForecasting) / 2)}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#16a34a' }}>📊 Volume de Données</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {mlMaturity.dataVolume.totalDealsAnalyzed.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fefce8', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#ca8a04' }}>🔧 Stabilité</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {Math.round(mlMaturity.stability.consistencyScore)}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fdf2f8', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#be185d' }}>🤖 Autonomie</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {Math.round(mlMaturity.autonomy.confidenceLevel)}%
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div style={{ 
                backgroundColor: mlMaturity.recommendations.readyForAutonomy ? '#dcfce7' : '#fef3c7',
                padding: '1.5rem',
                borderRadius: '8px',
                minWidth: '250px'
              }}>
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  color: mlMaturity.recommendations.readyForAutonomy ? '#16a34a' : '#d97706' 
                }}>
                  {mlMaturity.recommendations.readyForAutonomy ? '✅ Prêt pour Autonomie' : '⚠️ Amélioration Requise'}
                </h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                  {mlMaturity.recommendations.suggestedActions.slice(0, 3).map((action: string, i: number) => (
                    <div key={i} style={{ marginBottom: '0.3rem' }}>• {action}</div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.8rem', 
                  color: '#6b7280' 
                }}>
                  Risque: {mlMaturity.recommendations.riskLevel}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              🔄 Calcul de la maturité ML en cours...
            </div>
          )}
        </div>
        
        {/* Stats Overview */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '1rem' }}>
                👥 Utilisateurs
              </h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e40af', margin: '0.5rem 0' }}>
                {stats.overview?.totalUsers?.toLocaleString() || '0'}
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>
                {stats.overview?.premiumUsers || 0} Premium • {stats.overview?.freeUsers || 0} Gratuit
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '1rem' }}>
                🚀 Alertes envoyées
              </h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a', margin: '0.5rem 0' }}>
                {stats.overview?.totalAlerts?.toLocaleString() || '0'}
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>
                {stats.overview?.todayAlerts || 0} aujourd'hui
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d97706', marginBottom: '1rem' }}>
                💰 Économies générées
              </h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d97706', margin: '0.5rem 0' }}>
                €{Math.round(stats.overview?.totalSavings || 0).toLocaleString()}
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>Total utilisateurs</p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#be185d', marginBottom: '1rem' }}>
                🔄 API Calls
              </h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#be185d', margin: '0.5rem 0' }}>
                {stats.overview?.todayApiCalls?.toLocaleString() || '0'}
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>Aujourd'hui</p>
            </div>
          </div>
        )}
        
        {/* Routes Section */}
        {routes && routes.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem' }}>
              🛩️ Routes Actives ({routes.length})
            </h2>
            
            {/* Filtres par Tier */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setFilterTier(0)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: filterTier === 0 ? '#1e40af' : '#f3f4f6',
                  color: filterTier === 0 ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Tous ({routes.length})
              </button>
              <button 
                onClick={() => setFilterTier(1)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: filterTier === 1 ? '#dc2626' : '#fef2f2',
                  color: filterTier === 1 ? 'white' : '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Tier 1 ({routes.filter((r: any) => r.tier === 1).length})
              </button>
              <button 
                onClick={() => setFilterTier(2)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: filterTier === 2 ? '#d97706' : '#fef3c7',
                  color: filterTier === 2 ? 'white' : '#d97706',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Tier 2 ({routes.filter((r: any) => r.tier === 2).length})
              </button>
              <button 
                onClick={() => setFilterTier(3)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: filterTier === 3 ? '#16a34a' : '#f0fdf4',
                  color: filterTier === 3 ? 'white' : '#16a34a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Tier 3 ({routes.filter((r: any) => r.tier === 3).length})
              </button>
            </div>

            {/* Liste des routes */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {routes
                .filter((route: any) => filterTier === 0 || route.tier === filterTier)
                .map((route: any, index: number) => (
                <div key={route._id || index} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: '#f9fafb',
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr',
                  gap: '1.5rem',
                  alignItems: 'center'
                }}>
                  {/* Informations principales */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                      {route.origin} → {route.destination}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: route.tier === 1 ? '#fef2f2' : 
                                       route.tier === 2 ? '#fef3c7' : '#f0fdf4',
                        color: route.tier === 1 ? '#dc2626' : 
                               route.tier === 2 ? '#d97706' : '#16a34a',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        Tier {route.tier}
                      </span>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: route.isActive ? '#dcfce7' : '#fef3c7',
                        color: route.isActive ? '#16a34a' : '#d97706',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        {route.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>

                  {/* Détails techniques */}
                  <div style={{ fontSize: '0.9rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Fréquence scan:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.3rem' }}>
                          {route.scanFrequencyHours}h
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Alertes totales:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.3rem' }}>
                          {route.performance?.totalAlerts || 0}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Réduction moy:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.3rem' }}>
                          {route.performance?.avgDiscount || 0}%
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Taux clics:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '0.3rem' }}>
                          {route.performance?.clickRate || 0}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Métadonnées */}
                    {route.metadata && (
                      <div style={{ 
                        backgroundColor: '#f3f4f6', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ marginBottom: '0.3rem' }}>
                          <strong>Remarque:</strong> {route.metadata.remarks}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span><strong>Priorité:</strong> {route.metadata.priority}</span>
                          <span><strong>Réduction attendue:</strong> {route.metadata.expectedDiscountRange}</span>
                          <span><strong>Calls/scan:</strong> {route.metadata.estimatedCallsPerScan}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scores saisonniers */}
                  <div style={{ textAlign: 'right' }}>
                    {route.seasonalScore && (
                      <div style={{ fontSize: '0.8rem' }}>
                        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
                          Scores saisonniers:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                          <span style={{ color: '#6b7280' }}>Printemps:</span>
                          <span style={{ fontWeight: 'bold' }}>{route.seasonalScore.spring}%</span>
                          <span style={{ color: '#6b7280' }}>Été:</span>
                          <span style={{ fontWeight: 'bold' }}>{route.seasonalScore.summer}%</span>
                          <span style={{ color: '#6b7280' }}>Automne:</span>
                          <span style={{ fontWeight: 'bold' }}>{route.seasonalScore.fall}%</span>
                          <span style={{ color: '#6b7280' }}>Hiver:</span>
                          <span style={{ fontWeight: 'bold' }}>{route.seasonalScore.winter}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Users Section */}
        {users && users.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem' }}>
              👥 Utilisateurs ({users.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {users.slice(0, 10).map((user: any, index: number) => (
                <div key={user._id || index} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 0.3rem 0' }}>
                        {user.email}
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                        {user.createdAt ? `Créé le ${new Date(user.createdAt).toLocaleDateString()}` : 'Utilisateur système'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        backgroundColor: user.subscription_type === 'premium' ? '#dbeafe' : 
                                       user.subscription_type === 'enterprise' ? '#fef3c7' : '#f3f4f6',
                        color: user.subscription_type === 'premium' ? '#1d4ed8' : 
                               user.subscription_type === 'enterprise' ? '#d97706' : '#6b7280',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        textTransform: 'capitalize' as any
                      }}>
                        {user.subscription_type}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    <p style={{ margin: '0.3rem 0' }}>
                      <span style={{ fontWeight: '500' }}>Type:</span> {user.subscription_type}
                    </p>
                    {user.createdAt && (
                      <p style={{ margin: '0.3rem 0' }}>
                        <span style={{ fontWeight: '500' }}>Membre depuis:</span> {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {users.length > 10 && (
              <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '1rem', fontSize: '0.9rem' }}>
                ... et {users.length - 10} autres utilisateurs
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Professional Marketing Landing Page
const LandingPage: React.FC<{ 
  onAdminAccess: () => void;
  onPremiumSignup: () => void;
  onPremiumLogin: () => void;
}> = ({ onAdminAccess, onPremiumSignup, onPremiumLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setMessage(data.message);
        setEmail('');
        setTimeout(() => {
          setShowSuccess(false);
          setMessage('');
        }, 4000);
      } else {
        setMessage(data.message || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      setMessage('Erreur de connexion au serveur');
    }
    
    setIsSubmitting(false);
  };

  const handlePremiumSignup = () => {
    onPremiumSignup();
  };

  const styles = {
    // Hero Section
    hero: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
      textAlign: 'center' as const
    },
    
    // Typography
    heroTitle: {
      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
      fontWeight: '800',
      marginBottom: '1rem',
      lineHeight: '1.1',
      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
    },
    heroSubtitle: {
      fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
      marginBottom: '2rem',
      opacity: 0.95,
      maxWidth: '600px',
      lineHeight: '1.4'
    },
    
    // Email Form
    emailForm: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
      maxWidth: '400px',
      width: '100%',
      marginBottom: '2rem'
    },
    emailInput: {
      padding: '16px 20px',
      fontSize: '1.1rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      fontWeight: '500'
    },
    ctaButton: {
      padding: '16px 32px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      backgroundColor: '#ff6b35',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 6px 20px rgba(255, 107, 53, 0.4)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    },
    
    // Secondary Actions
    secondaryActions: {
      marginTop: '1.5rem',
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap' as const,
      justifyContent: 'center'
    },
    linkButton: {
      color: 'white',
      textDecoration: 'underline',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1.1rem',
      fontWeight: '500',
      transition: 'opacity 0.3s'
    },
    
    // Success Message
    successMessage: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '1rem 2rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      fontSize: '1.1rem',
      fontWeight: '600'
    },

    // Error Message
    errorMessage: {
      backgroundColor: '#dc2626',
      color: 'white',
      padding: '1rem 2rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      fontSize: '1.1rem',
      fontWeight: '600'
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          🌍 GlobeGenius
        </h1>
        <h2 style={styles.heroSubtitle}>
          L'assistant voyage intelligent qui vous fait économiser jusqu'à 90% sur vos billets d'avion
        </h2>
        
        {/* TEMPORAIRE: Bouton admin pour debug */}
        <button
          onClick={() => onAdminAccess()}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          DEBUG ADMIN
        </button>
        
        {showSuccess && (
          <div style={styles.successMessage}>
            ✅ {message}
          </div>
        )}

        {message && !showSuccess && (
          <div style={styles.errorMessage}>
            ⚠️ {message}
          </div>
        )}
        
        <form style={styles.emailForm} onSubmit={handleEmailSubmit}>
          <input
            type="email"
            placeholder="Votre adresse email pour recevoir les offres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.emailInput}
            required
          />
          <button
            type="submit"
            style={{
              ...styles.ctaButton,
              opacity: isSubmitting ? 0.7 : 1,
              transform: isSubmitting ? 'scale(0.98)' : 'scale(1)'
            }}
            disabled={isSubmitting}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
              }
            }}
          >
            {isSubmitting ? 'Inscription...' : '🚀 Recevoir les offres gratuitement'}
          </button>
        </form>
        
        <div style={styles.secondaryActions}>
          <button
            style={styles.linkButton}
            onClick={() => {
              const element = document.getElementById('premium');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Voir l'offre Premium →
          </button>
          <button
            style={styles.linkButton}
            onClick={() => {
              const element = document.getElementById('features');
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Comment ça marche ?
          </button>
          <button
            style={{
              ...styles.linkButton,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              border: '1px solid #10b981',
              fontWeight: '600'
            }}
            onClick={onPremiumLogin}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
              e.currentTarget.style.color = '#10b981';
            }}
          >
            🔑 Se connecter
          </button>
        </div>
        
        <p style={{ marginTop: '2rem', opacity: 0.8, fontSize: '0.9rem' }}>
          ✨ Gratuit • Pas de spam • Désabonnement en 1 clic
        </p>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        backgroundColor: '#f8fafc',
        padding: '80px 20px',
        textAlign: 'center' as const
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1e293b',
          marginBottom: '3rem'
        }}>
          Pourquoi 50,000+ voyageurs nous font confiance
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
              Alertes Personnalisées
            </h3>
            <p style={{ color: '#64748b', lineHeight: '1.6' }}>
              Recevez des notifications instantanées quand les prix baissent sur vos destinations préférées. 
              Notre IA surveille 24h/24 plus de 500 compagnies aériennes.
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
              IA Prédictive
            </h3>
            <p style={{ color: '#64748b', lineHeight: '1.6' }}>
              Notre intelligence artificielle analyse les tendances et prédit les meilleurs moments pour réserver. 
              Économisez en moyenne 45% sur vos vols.
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
              Erreurs de Prix
            </h3>
            <p style={{ color: '#64748b', lineHeight: '1.6' }}>
              Soyez le premier averti des erreurs de prix des compagnies. 
              Nos membres ont économisé jusqu'à 90% sur des vols premium.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="premium" style={{
        backgroundColor: '#1e293b',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center' as const
      }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Choisissez votre plan
        </h2>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '3rem' }}>
          Déjà 10,000€ économisés par nos membres ce mois-ci
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          maxWidth: '800px',
          margin: '2rem auto 0'
        }}>
          {/* FREE PLAN */}
          <div style={{
            backgroundColor: 'white',
            color: '#1e293b',
            padding: '2.5rem',
            borderRadius: '16px',
            position: 'relative' as const
          }}>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Gratuit</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#6366f1' }}>0€</div>
            <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '2rem' }}>Pour commencer</p>
            <ul style={{ textAlign: 'left', lineHeight: '2.2', marginBottom: '2rem', fontSize: '1.1rem' }}>
              <li>✅ 5 alertes par mois</li>
              <li>✅ Destinations populaires</li>
              <li>✅ Email quotidien</li>
              <li>❌ Alertes erreurs de prix</li>
              <li>❌ IA prédictive</li>
              <li>❌ Support prioritaire</li>
            </ul>
            <button
              style={{
                ...styles.ctaButton,
                backgroundColor: '#6366f1',
                width: '100%',
                textTransform: 'none' as const,
                fontSize: '1.1rem'
              }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Commencer gratuitement
            </button>
          </div>
          
          {/* PREMIUM PLAN */}
          <div style={{
            backgroundColor: '#ff6b35',
            color: 'white',
            padding: '2.5rem',
            borderRadius: '16px',
            position: 'relative' as const,
            transform: 'scale(1.05)',
            border: '4px solid #fbbf24'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#fbbf24',
              color: '#1e293b',
              padding: '0.7rem 1.5rem',
              borderRadius: '25px',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}>
              🔥 RECOMMANDÉ
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Premium</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              4,99€<span style={{ fontSize: '1.2rem', opacity: 0.8 }}>/mois</span>
            </div>
            <p style={{ opacity: 0.9, marginBottom: '2rem', fontSize: '1rem' }}>Économisez 100x votre investissement !</p>
            <ul style={{ textAlign: 'left', lineHeight: '2.2', marginBottom: '2rem', fontSize: '1.1rem' }}>
              <li>✅ Alertes illimitées</li>
              <li>✅ Toutes destinations</li>
              <li>✅ Alertes erreurs de prix</li>
              <li>✅ IA prédictive avancée</li>
              <li>✅ Support prioritaire</li>
              <li>✅ Garantie remboursement</li>
            </ul>
            <button
              style={{
                ...styles.ctaButton,
                backgroundColor: '#fbbf24',
                color: '#1e293b',
                width: '100%',
                textTransform: 'none' as const,
                fontSize: '1.1rem'
              }}
              onClick={handlePremiumSignup}
            >
              🎯 Essayer Premium gratuit
            </button>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
              💳 Essai gratuit 7 jours • Annulation à tout moment
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: '3rem', opacity: 0.9 }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            💰 <strong>ROI garanti :</strong> Économisez votre abonnement dès le premier vol trouvé
          </p>
          <p style={{ fontSize: '1rem' }}>
            🛡️ Annulation possible à tout moment • 🇫🇷 Support français • ⚡ Activation immédiate
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '3rem 2rem 2rem',
        textAlign: 'center' as const
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🌍 GlobeGenius</h4>
          <p style={{ opacity: 0.8, maxWidth: '500px', margin: '0 auto' }}>
            L'assistant voyage intelligent qui révolutionne votre façon de voyager. 
            Rejoignez des milliers de voyageurs qui économisent chaque jour.
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap' as const,
          marginBottom: '2rem'
        }}>
          <button style={styles.linkButton} onClick={() => alert('À propos...')}>À propos</button>
          <button style={styles.linkButton} onClick={() => alert('Contact...')}>Contact</button>
          <button style={styles.linkButton} onClick={() => alert('CGU...')}>CGU</button>
          <button style={styles.linkButton} onClick={() => alert('Confidentialité...')}>Confidentialité</button>
        </div>
        
        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
          © 2024 GlobeGenius. Tous droits réservés. 🇫🇷 Fait avec ❤️ en France
        </p>
      </footer>
    </div>
  );
};

// Premium Dashboard Component
const PremiumDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh toutes les 60 secondes
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Récupérer les statistiques utilisateur et alertes
      const [statsRes, alertsRes] = await Promise.all([
        fetch('/api/users/stats', { headers }),
        fetch('/api/alerts/user', { headers })
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setUserStats(stats);
      }
      
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.slice(0, 10)); // Dernières 10 alertes
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        color: '#64748b'
      }}>
        🔄 Chargement de votre dashboard...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                ✨ Dashboard Premium
              </h1>
              <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>
                Bienvenue {user.email} - Compte Premium Actif
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={fetchDashboardData}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Actualiser
              </button>
              <button
                onClick={onLogout}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '1rem' }}>
              🚀 Alertes Reçues
            </h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#16a34a', margin: '0.5rem 0' }}>
              {alerts.length}
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>
              Ce mois
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d97706', marginBottom: '1rem' }}>
              💰 Économies Potentielles
            </h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d97706', margin: '0.5rem 0' }}>
              €{userStats?.totalSavings || 0}
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>
              Depuis inscription
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '1rem' }}>
              ✈️ Destinations Surveillées
            </h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', margin: '0.5rem 0' }}>
              {userStats?.watchedDestinations || 0}
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>
              Routes actives
            </p>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#be185d', marginBottom: '1rem' }}>
              📊 Profile Completeness
            </h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#be185d', margin: '0.5rem 0' }}>
              {userStats?.profileCompleteness || 100}%
            </p>
            <p style={{ color: '#64748b', margin: 0 }}>
              Optimisation
            </p>
          </div>
        </div>

        {/* Recent Alerts */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem' }}>
            📬 Dernières Alertes
          </h2>
          
          {alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alerts.map((alert, index) => (
                <div 
                  key={index}
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>
                        ✈️ {alert.route || 'CDG → JFK'}
                      </h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#16a34a', fontWeight: 'bold' }}>
                        💰 Économie: €{alert.savings || Math.floor(Math.random() * 200 + 50)}
                      </p>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                        {alert.description || 'Erreur de prix détectée - Prix exceptionnel disponible'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'Aujourd\'hui'}
                      </div>
                      <button
                        style={{
                          marginTop: '0.5rem',
                          padding: '6px 12px',
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                        onClick={() => alert('Redirection vers la réservation...')}
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Aucune alerte pour le moment</h3>
              <p style={{ margin: 0 }}>
                Vos préférences de voyage sont configurées. Les alertes arriveront bientôt !
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Premium Login Component
const PremiumLogin: React.FC<{ onBack: () => void; onLogin: (user: User) => void }> = ({ onBack, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Stocker les informations de connexion
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          ...data.user,
          type: data.user.subscription_type === 'enterprise' ? 'admin' : 'user'
        }));

        // Appeler la fonction onLogin
        onLogin({
          id: data.user.id,
          email: data.user.email,
          type: data.user.subscription_type === 'enterprise' ? 'admin' : 'user',
          name: data.user.email,
          subscription_type: data.user.subscription_type
        });
      } else {
        setError(data.message || 'Email ou mot de passe incorrect');
      }
    } catch (error) {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        padding: '3rem',
        width: '100%',
        maxWidth: '420px',
        position: 'relative'
      }}>
        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ←
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '0.5rem'
          }}>
            🔑 Connexion
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1rem'
          }}>
            Connectez-vous à votre compte GlobeGenius
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              placeholder="Votre mot de passe"
              required
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '🔄 Connexion...' : '🚀 Se connecter'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}>
            Pas encore de compte Premium ?
          </p>
          <button
            onClick={() => {
              onBack();
              // Trigger premium signup after going back
              setTimeout(() => {
                const element = document.getElementById('premium');
                element?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            style={{
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Créer un compte Premium →
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'admin-login' | 'admin' | 'premium-signup' | 'premium-login' | 'dashboard'>('home');
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'auto-login au chargement et détecter l'URL admin
  useEffect(() => {
    console.log('🔍 Frontend useEffect - Vérification accès admin');
    console.log('URL actuelle:', window.location.href);
    console.log('Paramètres URL:', window.location.search);
    console.log('Hash URL:', window.location.hash);
    
    // Détecter si l'accès admin a été demandé via /admin-access
    const adminAccessRequested = sessionStorage.getItem('admin-access-requested');
    if (adminAccessRequested) {
      console.log('🔑 Admin access via sessionStorage détecté');
      sessionStorage.removeItem('admin-access-requested'); // Nettoyer le flag
      setCurrentPage('admin-login');
      setIsLoading(false);
      return;
    }

    // Détecter si l'URL contient #admin-dashboard (après connexion admin)
    if (window.location.hash === '#admin-dashboard') {
      console.log('🔑 Admin dashboard via hash détecté');
      window.history.replaceState({}, '', '/'); // Nettoyer l'URL
      setCurrentPage('admin');
      setIsLoading(false);
      return;
    }

    // Détecter si l'URL contient ?admin ou #admin-access pour l'accès admin discret
    const urlParams = new URLSearchParams(window.location.search);
    const hashContainsAdmin = window.location.hash === '#admin-access';
    const queryContainsAdmin = urlParams.get('admin') === 'access';
    const adminDashboardRequested = urlParams.get('admin') === 'dashboard';
    
    console.log('Paramètres détectés:', {
      hashContainsAdmin,
      queryContainsAdmin,
      adminDashboardRequested,
      tokenFromUrl: urlParams.get('token') ? 'PRÉSENT' : 'ABSENT'
    });
    
    // Si admin=dashboard avec token, connecter automatiquement
    if (adminDashboardRequested) {
      console.log('🚀 Admin dashboard avec token détecté !');
      const tokenFromUrl = urlParams.get('token');
      if (tokenFromUrl) {
        console.log('✅ Token trouvé, connexion automatique...');
        // Stocker le token et rediriger vers admin
        localStorage.setItem('token', tokenFromUrl);
        localStorage.setItem('user', JSON.stringify({
          id: 'admin',
          email: 'admin@globegenius.app',
          type: 'admin',
          name: 'Administrateur',
          subscription_type: 'enterprise'
        }));
        setCurrentUser({
          id: 'admin',
          email: 'admin@globegenius.app',
          type: 'admin',
          name: 'Administrateur',
          subscription_type: 'enterprise'
        });
        setCurrentPage('admin');
        // Nettoyer l'URL
        window.history.replaceState({}, '', '/');
        setIsLoading(false);
        console.log('🎯 Redirection vers console admin terminée');
        return;
      } else {
        console.log('❌ Token manquant dans URL');
      }
    }
    
    if (window.location.pathname === '/admin-access' || hashContainsAdmin || queryContainsAdmin) {
      console.log('🔑 Accès admin discret détecté');
      setCurrentPage('admin-login');
      // Nettoyer l'URL pour la sécurité
      window.history.replaceState({}, '', '/');
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        
        // Rediriger vers le bon dashboard selon le type d'utilisateur
        if (user.subscription_type === 'enterprise') {
          setCurrentPage('admin');
        } else if (user.subscription_type === 'premium') {
          setCurrentPage('dashboard');
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleAdminLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('admin');
  };

  const handlePremiumLogin = (user: User) => {
    setCurrentUser(user);
    if (user.subscription_type === 'premium') {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('home');
    }
  };

  const handleAdminLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('home');
  };

  const handlePremiumSuccess = () => {
    setCurrentPage('home');
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        color: '#64748b'
      }}>
        🔄 Chargement...
      </div>
    );
  }

  // Show premium dashboard (for premium users)
  if (currentPage === 'dashboard' && currentUser?.subscription_type === 'premium') {
    return <PremiumDashboard user={currentUser} onLogout={handleAdminLogout} />;
  }

  // Show premium signup page
  if (currentPage === 'premium-signup') {
    return (
      <PremiumOnboarding 
        onBack={() => setCurrentPage('home')} 
        onSuccess={handlePremiumSuccess}
      />
    );
  }

  // Show premium login page
  if (currentPage === 'premium-login') {
    return <PremiumLogin onLogin={handlePremiumLogin} onBack={() => setCurrentPage('home')} />;
  }

  // Show admin login page
  if (currentPage === 'admin-login') {
    return <AdminLogin onLogin={handleAdminLogin} onBack={() => setCurrentPage('home')} />;
  }

  // Show admin dashboard (only for admin users)
  if (currentPage === 'admin' && currentUser?.type === 'admin') {
    return <AdminDashboard />;
  }

  // Show landing page (default) - AVEC bouton debug temporaire
  return (
    <LandingPage 
      onAdminAccess={() => setCurrentPage('admin-login')} // Redirection directe pour debug
      onPremiumSignup={() => setCurrentPage('premium-signup')}
      onPremiumLogin={() => setCurrentPage('premium-login')}
    />
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
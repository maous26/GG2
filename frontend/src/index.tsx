import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import EnhancedAdminDashboard from './pages/EnhancedAdminDashboard';
import EnhancedLandingPage from './components/EnhancedLandingPage';

// AdminDashboard wrapper component
const AdminDashboard: React.FC = () => {
  return <EnhancedAdminDashboard />;
};

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
    // Final validation check before submission
    if (!userData.email || !userData.name || !isValidEmail(userData.email)) {
      alert('❌ Erreur de validation: Email invalide ou nom manquant.\n\nVeuillez retourner à l\'étape 1 pour corriger ces informations.');
      return;
    }

    if (!userData.password || !isValidPassword(userData.password)) {
      alert('❌ Erreur de validation: Mot de passe invalide.\n\nLe mot de passe doit contenir:\n• Au moins 8 caractères\n• Une majuscule\n• Un chiffre');
      return;
    }

    if (userData.password !== userData.confirmPassword) {
      alert('❌ Erreur de validation: Les mots de passe ne correspondent pas.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 1. Créer l'utilisateur premium
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userData.email, 
          name: userData.name, // Ajout du nom
          password: userData.password,
          subscription_type: 'premium'
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        if (registerResponse.status === 400 && errorData.message === 'User already exists') {
          // Try to login with the existing user and upgrade to premium
          setMessage(`Un compte existe déjà avec l'email ${userData.email}. Tentative de mise à niveau vers Premium...`);
          
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userData.email,
              password: userData.password
            }),
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            // User exists and password is correct, continue with preferences update
            const user = loginData.user;
            setMessage('Connexion réussie! Mise à jour de vos préférences...');
            
            // Continue with the preferences update flow...
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
                  notificationStyle: userData.notificationStyle || 'friendly',
                  budgetRange: userData.budgetRange
                },
                onboardingCompleted: true
              }),
            });
            
            if (preferencesResponse.ok) {
              setMessage('✅ Compte Premium activé avec succès! Redirection vers votre dashboard...');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 2000);
            } else {
              throw new Error('Erreur lors de la mise à jour des préférences');
            }
            return; // Exit early since we handled the existing user case
          } else {
            throw new Error(`Un compte existe déjà avec l'email ${userData.email}. Le mot de passe fourni ne correspond pas. Veuillez utiliser le bon mot de passe ou une autre adresse email.`);
          }
        }
        throw new Error(`Erreur lors de la création du compte: ${errorData.message || 'Erreur inconnue'}`);
      }

      const registerData = await registerResponse.json();
      const { user, token } = registerData;

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

  // Helper function to validate email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
            placeholder="Votre email (ex: nom@exemple.com)" 
            style={{
              ...styles.input,
              borderColor: userData.email && !isValidEmail(userData.email) ? '#ef4444' : undefined
            }}
            value={userData.email}
            onChange={(e) => setUserData({...userData, email: e.target.value})}
          />
          
          {/* Email validation error */}
          {userData.email && !isValidEmail(userData.email) && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              ⚠️ Veuillez saisir une adresse email valide
            </div>
          )}
          
          <button 
            style={{
              ...styles.button,
              backgroundColor: (!userData.email || !userData.name || !isValidEmail(userData.email)) ? '#9ca3af' : styles.button.backgroundColor,
              cursor: (!userData.email || !userData.name || !isValidEmail(userData.email)) ? 'not-allowed' : 'pointer',
              opacity: (!userData.email || !userData.name || !isValidEmail(userData.email)) ? 0.6 : 1
            }}
            onClick={(e) => {
              if (!userData.email || !userData.name || !isValidEmail(userData.email)) {
                e.preventDefault();
                alert('⚠️ Veuillez remplir tous les champs correctement avant de continuer.\n\n' +
                      '✓ Nom complet requis\n' +
                      '✓ Email valide requis (ex: nom@exemple.com)');
                return;
              }
              setCurrentStep('password');
            }}
            disabled={!userData.email || !userData.name || !isValidEmail(userData.email)}
          >
            Continuer → Mot de passe
          </button>
        </div>
      </div>
    );
  }

  // Helper function to validate password
  const isValidPassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasMinLength && hasUppercase && hasNumber;
  };

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
            style={{
              ...styles.input,
              borderColor: userData.password && !isValidPassword(userData.password) ? '#ef4444' : undefined
            }}
            value={userData.password}
            onChange={(e) => setUserData({...userData, password: e.target.value})}
          />
          
          <input 
            type="password" 
            placeholder="Confirmez votre mot de passe" 
            style={{
              ...styles.input,
              borderColor: userData.confirmPassword && userData.password !== userData.confirmPassword ? '#ef4444' : undefined
            }}
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
                width: `${userData.password ? (isValidPassword(userData.password) ? 100 : 50) : 0}%`,
                height: '100%',
                backgroundColor: isValidPassword(userData.password) ? '#10b981' : userData.password.length > 0 ? '#f59e0b' : '#ef4444',
                transition: 'all 0.3s'
              }}></div>
            </div>
            <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '0.3rem'}}>
              {isValidPassword(userData.password) ? 'Fort ✓' : userData.password.length > 0 ? 'Faible - critères manquants' : 'Aucun mot de passe'}
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
            style={{
              ...styles.button,
              backgroundColor: (!isValidPassword(userData.password) || userData.password !== userData.confirmPassword) ? '#9ca3af' : styles.button.backgroundColor,
              cursor: (!isValidPassword(userData.password) || userData.password !== userData.confirmPassword) ? 'not-allowed' : 'pointer',
              opacity: (!isValidPassword(userData.password) || userData.password !== userData.confirmPassword) ? 0.6 : 1
            }}
            onClick={(e) => {
              if (!isValidPassword(userData.password)) {
                e.preventDefault();
                alert('⚠️ Votre mot de passe ne respecte pas les exigences de sécurité.\n\n' +
                      'Exigences :\n' +
                      '✓ Au moins 8 caractères\n' +
                      '✓ Une majuscule (A-Z)\n' +
                      '✓ Un chiffre (0-9)');
                return;
              }
              if (userData.password !== userData.confirmPassword) {
                e.preventDefault();
                alert('⚠️ Les mots de passe ne correspondent pas.\n\nVeuillez saisir le même mot de passe dans les deux champs.');
                return;
              }
              setCurrentStep('airports');
            }}
            disabled={!isValidPassword(userData.password) || userData.password !== userData.confirmPassword}
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

// Note: LandingPage is now imported from ./components/EnhancedLandingPage

// Premium Dashboard Component
const PremiumDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

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

          {/* Navigation Tabs */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            marginTop: '2rem',
            paddingTop: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              {[
                { id: 'overview', name: 'Vue d\'ensemble', icon: '📊' },
                { id: 'preferences', name: 'Préférences', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '1rem'
                  }}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
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
          </>
        )}

        {/* Adaptive Pricing Tab */}
        {/* adaptive tab removed */}

        {/* User Preferences Tab */}
        {activeTab === 'preferences' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem' }}>
              ⚙️ Préférences & Compte
            </h2>
            
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🧠</span>
                <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>Système de Prix Adaptatif Activé</h3>
              </div>
              <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem' }}>
                Votre compte Premium utilise maintenant notre IA pour ajuster automatiquement vos seuils de prix. 
                Consultez l'onglet "Prix Adaptatif IA" pour plus de détails sur votre configuration personnalisée.
              </p>
            </div>

            {/* Onboarding recap */}
            {userStats && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#334155' }}>📝 Récapitulatif de votre onboarding</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.75rem' }}>
                  <div><strong>Type de voyageur:</strong> {userStats?.preferences?.travelerType || '—'}</div>
                  <div><strong>Style de notifications:</strong> {userStats?.preferences?.notificationStyle || '—'}</div>
                  <div><strong>Aéroports additionnels:</strong> {userStats?.preferences?.additionalAirports?.join(', ') || 'Aucun'}</div>
                  <div><strong>Destinations de rêve:</strong> {Array.isArray(userStats?.preferences?.dreamDestinations) ? userStats?.preferences?.dreamDestinations.length : 0}</div>
                  <div><strong>Budget:</strong> {userStats?.preferences?.budgetRange ? `${userStats.preferences.budgetRange.min}-${userStats.preferences.budgetRange.max} ${userStats.preferences.budgetRange.currency || 'EUR'}` : '—'}</div>
                </div>
              </div>
            )}

            {/* Password reset */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: '#374151' }}>🔐 Changer le mot de passe</h3>
              <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
                <input type="password" placeholder="Mot de passe actuel" value={passwordForm.currentPassword} onChange={(e)=>setPasswordForm({...passwordForm,currentPassword:e.target.value})} style={{padding:'10px',border:'1px solid #d1d5db',borderRadius:8}} />
                <input type="password" placeholder="Nouveau mot de passe" value={passwordForm.newPassword} onChange={(e)=>setPasswordForm({...passwordForm,newPassword:e.target.value})} style={{padding:'10px',border:'1px solid #d1d5db',borderRadius:8}} />
                <input type="password" placeholder="Confirmer le nouveau mot de passe" value={passwordForm.confirm} onChange={(e)=>setPasswordForm({...passwordForm,confirm:e.target.value})} style={{padding:'10px',border:'1px solid #d1d5db',borderRadius:8}} />
                <button onClick={async()=>{
                  setPasswordMsg('');
                  if(!passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword!==passwordForm.confirm){
                    setPasswordMsg('Veuillez remplir correctement le formulaire.');
                    return;
                  }
                  try{
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/users/password',{
                      method:'PUT',
                      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
                      body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
                    });
                    const data = await res.json();
                    if(res.ok){
                      setPasswordMsg('Mot de passe mis à jour avec succès.');
                      setPasswordForm({ currentPassword:'', newPassword:'', confirm:'' });
                    } else {
                      setPasswordMsg(data?.message || 'Erreur lors de la mise à jour du mot de passe');
                    }
                  }catch(err){
                    setPasswordMsg('Erreur réseau.');
                  }
                }} style={{padding:'10px 14px',background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Mettre à jour</button>
                {passwordMsg && <div style={{color:'#374151'}}>{passwordMsg}</div>}
              </div>
            </div>
          </div>
        )}
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
      console.log('🔍 LOGIN DEBUG: Attempting login with:', { email, passwordLength: password?.length });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log('🔍 LOGIN DEBUG: Response status:', response.status);
      console.log('🔍 LOGIN DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('🔍 LOGIN DEBUG: Response ok:', response.ok);

      const data = await response.json();
      console.log('🔍 LOGIN DEBUG: Response data:', data);

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
      console.log('🔍 LOGIN DEBUG: Catch block error:', error);
      console.log('🔍 LOGIN DEBUG: Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
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

        {/* Forgot Password Link */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => {
              alert('📧 Fonctionnalité de récupération de mot de passe\n\nCette fonctionnalité sera bientôt disponible.\nEn attendant, contactez-nous à support@globegenius.app pour réinitialiser votre mot de passe.');
            }}
            style={{
              color: '#6b7280',
              background: 'none',
              border: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            🔑 Mot de passe oublié ?
          </button>
        </div>

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
    console.log('🔍 ADMIN LOGIN DEBUG: User received:', user);
    console.log('🔍 ADMIN LOGIN DEBUG: User type:', user.type);
    console.log('🔍 ADMIN LOGIN DEBUG: User subscription_type:', user.subscription_type);
    setCurrentUser(user);
    setCurrentPage('admin');
    console.log('🔍 ADMIN LOGIN DEBUG: Set currentPage to admin');
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
  if (currentPage === 'admin' && (currentUser?.type === 'admin' || currentUser?.subscription_type === 'enterprise')) {
    console.log('🔍 RENDER DEBUG: Showing admin dashboard');
    return <AdminDashboard />;
  }

  console.log('🔍 RENDER DEBUG: Showing landing page', {
    currentPage,
    currentUser: currentUser ? {
      type: currentUser.type,
      subscription_type: currentUser.subscription_type
    } : null
  });

    // Show landing page (default) - Enhanced version with professional French design
  return (
    <EnhancedLandingPage 
      onAdminAccess={() => setCurrentPage('admin-login')}
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
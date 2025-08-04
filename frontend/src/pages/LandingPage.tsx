import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setEmail('');
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const handlePremiumActivation = () => {
    alert('🎉 Compte Premium activé pour les tests !\n\nVous avez maintenant accès à :\n✅ Alertes illimitées\n✅ Alertes erreurs de prix\n✅ IA prédictive avancée\n✅ Support prioritaire\n\nRedirection vers le dashboard...');
    navigate('/dashboard');
  };

  const handleAdminAccess = () => {
    navigate('/admin');
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
    
    // Admin Access (Hidden)
    adminButton: {
      position: 'fixed' as const,
      bottom: '20px',
      right: '20px',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '60px',
      height: '60px',
      fontSize: '1.5rem',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
      transition: 'all 0.3s ease',
      zIndex: 1000
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
    }
  };

  return (
    <div>
      {/* Admin Access Button (Hidden in bottom right) */}
      <button
        style={styles.adminButton}
        onClick={handleAdminAccess}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
        }}
        title="Accès Admin"
      >
        ⚙️
      </button>

      {/* Hero Section */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          🌍 GlobeGenius
        </h1>
        <h2 style={styles.heroSubtitle}>
          L'assistant voyage intelligent qui vous fait économiser jusqu'à 90% sur vos billets d'avion
        </h2>
        
        {showSuccess && (
          <div style={styles.successMessage}>
            ✅ Parfait ! Vous recevrez nos meilleures offres par email
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
            onClick={() => navigate('/dashboard')}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Déjà membre ? Connexion
          </button>
        </div>
        
        <p style={{ marginTop: '2rem', opacity: 0.8, fontSize: '0.9rem' }}>
          ✨ Gratuit • Pas de spam • Désabonnement en 1 clic
        </p>
      </section>

      {/* Features Section */}
      <section style={{
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
            <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '2rem' }}>Pour découvrir le service</p>
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
              onClick={handlePremiumActivation}
            >
              🎯 Activer Premium (TEST)
            </button>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
              💡 Mode test - pas de paiement requis
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

export default LandingPage;
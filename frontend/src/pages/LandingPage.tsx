import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePremiumActivation = () => {
    // Simulate successful premium activation
    setShowSuccess(true);
    setTimeout(() => {
      alert('🎉 PREMIUM ACTIVÉ !\n\n✅ Accès immédiat à toutes les fonctionnalités\n✅ Erreurs de prix en temps réel\n✅ IA prédictive avancée\n✅ Support prioritaire\n\nRedirection vers votre dashboard...');
      navigate('/dashboard');
    }, 1000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setEmail('');
      // Immediately show premium offer after email
      setTimeout(() => {
        document.getElementById('premium-offer')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }, 1000);
  };

  const styles = {
    // Global
    container: {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      lineHeight: '1.6',
      backgroundColor: '#f8fafc',
      color: '#1f2937'
    },

    // Hero Section with Urgency
    hero: {
      minHeight: '90vh',
      background: 'linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      color: '#111827',
      padding: '24px',
      textAlign: 'center' as const,
      position: 'relative' as const,
      borderBottom: '1px solid #e5e7eb'
    },

    // Logo integration
    logo: {
      width: '72px',
      height: '72px',
      marginBottom: '1rem',
      filter: 'none'
    },

    // Urgency banner
    urgencyBanner: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#eef2f7',
      color: '#475569',
      padding: '10px 12px',
      textAlign: 'center' as const,
      fontWeight: 500,
      zIndex: 10,
    },

    heroTitle: {
      fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
      fontWeight: 800,
      marginBottom: '0.75rem',
      lineHeight: '1.15',
      color: '#0f172a'
    },

    heroSubtitle: {
      fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
      marginBottom: '1rem',
      fontWeight: 600,
      color: '#334155'
    },

    heroDescription: {
      fontSize: 'clamp(1.05rem, 2.2vw, 1.3rem)',
      marginBottom: '1.5rem',
      color: '#475569',
      maxWidth: '720px',
      lineHeight: '1.6'
    },

    // Social Proof
    socialProof: {
      backgroundColor: '#ffffff',
      padding: '0.75rem 1rem',
      borderRadius: '10px',
      marginBottom: '1.25rem',
      border: '1px solid #e5e7eb',
      color: '#475569'
    },

    // CTA Buttons
    premiumCta: {
      padding: '14px 28px',
      fontSize: '1.05rem',
      fontWeight: 600,
      background: '#2563eb',
      color: '#ffffff',
      border: '1px solid #1d4ed8',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: '0 8px 20px rgba(37, 99, 235, 0.15)',
      letterSpacing: '0.2px',
      marginBottom: '0.75rem'
    },

    freeCta: {
      padding: '12px 24px',
      fontSize: '1rem',
      fontWeight: 500,
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #cbd5e1',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    },

    // Premium Offer Section
    premiumOffer: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '56px 20px',
      textAlign: 'center' as const,
      position: 'relative' as const,
      borderTop: '1px solid #e5e7eb'
    },

    // Comparison table
    comparisonContainer: {
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
    },

    comparisonHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      backgroundColor: '#1e293b',
      color: 'white',
    },

    comparisonRow: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      borderBottom: '1px solid #e5e7eb',
      alignItems: 'center',
    },

    featureCell: {
      padding: '1.5rem',
      textAlign: 'left' as const,
      fontSize: '1.1rem',
      fontWeight: '500',
      color: '#374151',
    },

    freeCell: {
      padding: '1.5rem',
      textAlign: 'center' as const,
      backgroundColor: '#f9fafb',
    },

    premiumCell: {
      padding: '1.5rem',
      textAlign: 'center' as const,
      backgroundColor: '#fef3c7',
      fontWeight: 'bold',
    },

    // Success stories
    testimonialCard: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      padding: '2rem',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      marginBottom: '1.5rem',
    },

    // Admin button
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
      boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
      zIndex: 1000,
    },

    // CTA Button
    ctaButton: {
      padding: '16px 32px',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'white',
    },

    // Link Button
    linkButton: {
      backgroundColor: 'transparent',
      color: 'rgba(255,255,255,0.8)',
      border: 'none',
      fontSize: '1rem',
      cursor: 'pointer',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      transition: 'color 0.3s ease',
    }
  };

  return (
    <div style={styles.container}>
      {/* Premium Benefits Banner */}
      <div style={{...styles.urgencyBanner, backgroundColor:'#0b1020'}}>
        GlobeGenius — Alertes tarifaires et prévisions de prix
      </div>

      {/* Admin Button */}
      <button
        style={styles.adminButton}
        onClick={() => navigate('/admin')}
        title="Accès Admin"
      >
        ⚙️
      </button>

      {/* Hero Section */}
      <section style={styles.hero}>
        {/* Logo SVG Integration */}
        <svg style={styles.logo} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          {/* Globe structure */}
          <circle cx="200" cy="200" r="150" fill="none" stroke="url(#globeGradient)" strokeWidth="8"/>
          <ellipse cx="200" cy="200" rx="150" ry="75" fill="none" stroke="url(#globeGradient)" strokeWidth="6"/>
          <ellipse cx="200" cy="200" rx="75" ry="150" fill="none" stroke="url(#globeGradient)" strokeWidth="6"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="url(#globeGradient)" strokeWidth="6"/>
          
          {/* Dynamic lightning bolt */}
          <path d="M200 120 L170 180 L210 180 L180 260 L220 200 L180 200 Z" 
                fill="url(#lightningGradient)" 
                stroke="#ffffff" 
                strokeWidth="2"/>
          
          {/* Radiating lines */}
          <g stroke="url(#rayGradient)" strokeWidth="12" strokeLinecap="round">
            <line x1="150" y1="80" x2="130" y2="50" opacity="0.8"/>
            <line x1="250" y1="80" x2="270" y2="50" opacity="0.8"/>
            <line x1="320" y1="150" x2="350" y2="130" opacity="0.8"/>
            <line x1="320" y1="250" x2="350" y2="270" opacity="0.8"/>
            <line x1="250" y1="320" x2="270" y2="350" opacity="0.8"/>
            <line x1="150" y1="320" x2="130" y2="350" opacity="0.8"/>
            <line x1="80" y1="250" x2="50" y2="270" opacity="0.8"/>
            <line x1="80" y1="150" x2="50" y2="130" opacity="0.8"/>
          </g>
          
          <defs>
            <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981"/>
              <stop offset="50%" stopColor="#34d399"/>
              <stop offset="100%" stopColor="#a7f3d0"/>
            </linearGradient>
            <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6"/>
              <stop offset="50%" stopColor="#1d4ed8"/>
              <stop offset="100%" stopColor="#1e40af"/>
            </linearGradient>
            <linearGradient id="rayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#1d4ed8"/>
            </linearGradient>
          </defs>
        </svg>

        <h1 style={styles.heroTitle}>GlobeGenius</h1>
        
        <h2 style={styles.heroSubtitle}>
          Ne cherchez plus les vols les moins chers, ce sont eux qui vous trouvent
        </h2>

        <p style={styles.heroDescription}>
          Alertes tarifaires intelligentes • Prévisions de prix basées sur l'IA • Optimisation des économies pour les voyageurs exigeants
        </p>

        <div style={styles.socialProof}>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            🏆 <strong>847 vols à -90%</strong> trouvés cette semaine • 💰 <strong>127 345€</strong> économisés par nos membres ce mois-ci
          </p>
        </div>

        {/* Primary CTA */}
        <button
          style={styles.premiumCta}
          onClick={handlePremiumActivation}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 53, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 107, 53, 0.4)';
          }}
        >
          🚀 DEVENIR PREMIUM
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '25px',
            height: '25px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            🔥
          </div>
        </button>

        <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '1rem' }}>
          <strong>4,99€/mois</strong> payable en une fois <strong>49,90€</strong><br/>
          ✅ Abonnement remboursé dès le premier voyage
        </p>

        <button
          style={styles.freeCta}
          onClick={() => {
            document.getElementById('email-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Commencer gratuitement (limité)
        </button>

        <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '1rem' }}>
          ⚡ Accès immédiat • 🛡️ Sans engagement • 🇫🇷 Support français
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
            💰 <strong>Garantie :</strong> Abonnement remboursé dès le premier billet acheté
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
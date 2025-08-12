import React, { useState, useEffect } from 'react';

interface EnhancedLandingPageProps {
  onAdminAccess?: () => void;
  onPremiumSignup?: () => void;
  onPremiumLogin?: () => void;
}

const EnhancedLandingPage: React.FC<EnhancedLandingPageProps> = ({ 
  onAdminAccess, 
  onPremiumSignup,
  onPremiumLogin
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePremiumActivation = () => {
    // Simulate successful premium activation
    setShowSuccess(true);
    setTimeout(() => {
      alert('🎉 PREMIUM ACTIVÉ !\n\n✅ Accès immédiat à toutes les fonctionnalités\n✅ Erreurs de prix en temps réel\n✅ IA prédictive avancée\n✅ Support prioritaire\n\nRedirection vers votre dashboard...');
      if (onPremiumSignup) {
        onPremiumSignup();
      }
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
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: '1.6',
    },

    // Hero Section with Urgency
    hero: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1020 0%, #111827 40%, #0b1020 100%)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e5e7eb',
      padding: '20px',
      textAlign: 'center' as const,
      position: 'relative' as const
    },

    // Logo integration
    logo: {
      width: '80px',
      height: '80px',
      marginBottom: '1rem',
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
    },

    // Urgency banner
    urgencyBanner: {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      right: '0',
      backgroundColor: '#ef4444',
      color: 'white',
      padding: '12px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
      animation: 'pulse 2s infinite',
      zIndex: 10,
    },

    heroTitle: {
      fontSize: 'clamp(2.5rem, 6vw, 4.2rem)',
      fontWeight: 800,
      marginBottom: '1rem',
      lineHeight: '1.1',
      color: '#e5e7eb',
      letterSpacing: '0.5px'
    },

    heroSubtitle: {
      fontSize: 'clamp(1.2rem, 3vw, 1.7rem)',
      marginBottom: '1.2rem',
      fontWeight: 600,
      color: '#9ca3af'
    },

    heroDescription: {
      fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
      marginBottom: '2rem',
      opacity: 0.95,
      maxWidth: '700px',
      lineHeight: '1.5',
    },

    // Social Proof
    socialProof: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: '1rem 2rem',
      borderRadius: '12px',
      marginBottom: '2rem',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
    },

    // CTA Buttons
    premiumCta: {
      padding: '16px 32px',
      fontSize: '1.1rem',
      fontWeight: 600,
      background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 10px 28px rgba(37, 99, 235, 0.35)',
      letterSpacing: '0.3px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      marginBottom: '0.75rem',
    },

    freeCta: {
      padding: '16px 32px',
      fontSize: '1.1rem',
      fontWeight: '600',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      border: '2px solid rgba(255,255,255,0.3)',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
    },

    // Premium Offer Section
    premiumOffer: {
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '60px 20px',
      textAlign: 'center' as const,
      position: 'relative' as const,
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
    }
  };

  return (
    <div style={styles.container}>
      {/* Admin Button */}
      <button
        style={styles.adminButton}
        onClick={() => {
          if (onAdminAccess) {
            onAdminAccess();
          }
        }}
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

        <h1 style={styles.heroTitle}>
          GlobeGenius
        </h1>
        
        <h2 style={styles.heroSubtitle}>
          Ne cherchez plus les vols les moins chers, ce sont eux qui vous trouvent
        </h2>

        <p style={styles.heroDescription}>
          Détection des erreurs des erreurs de prix • Prédictions IA • Alertes instantanées • Plus de 50 000 voyageurs économisent déjà des milliers d'euros
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
        </button>

        {/* Premium login link */}
        <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => onPremiumLogin && onPremiumLogin()}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Déjà Premium ? Se connecter
          </button>
        </div>

        <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '1rem' }}>
          <strong>4,99€/mois</strong> ou payable en une fois <strong>49,90€</strong><br/>
          ✅ Abonnement remboursé dès le premier billet acheté
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

      {/* Premium Offer Section */}
      <section id="premium-offer" style={styles.premiumOffer}>
        <h2 style={{ 
          fontSize: '3rem', 
          fontWeight: '900', 
          marginBottom: '1rem',
          background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Pourquoi Premium change TOUT
        </h2>
        
        <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem' }}>
          Nos membres Premium économisent <strong>40 fois plus</strong> que les utilisateurs gratuits. Voici pourquoi :
        </p>

        {/* Feature Comparison */}
        <div style={styles.comparisonContainer}>
          <div style={styles.comparisonHeader}>
            <div style={{ padding: '2rem', fontSize: '1.3rem', fontWeight: 'bold' }}>
              Fonctionnalités
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem' }}>
              Gratuit
            </div>
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem', backgroundColor: '#fbbf24', color: '#1e293b' }}>
              🏆 Premium
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              🔍 Alertes de prix basiques
            </div>
            <div style={styles.freeCell}>
              ✅ 5/mois
            </div>
            <div style={styles.premiumCell}>
              ✅ ILLIMITÉES
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              🤖 IA Prédictive avancée
            </div>
            <div style={styles.freeCell}>
              ❌ Non
            </div>
            <div style={styles.premiumCell}>
              ✅ Prédictions à 95%
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              💰 Erreurs de prix (jusqu'à -90%)
            </div>
            <div style={styles.freeCell}>
              ❌ Pas d'accès
            </div>
            <div style={styles.premiumCell}>
              ✅ Accès prioritaire
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              ⚡ Alertes instantanées (temps réel)
            </div>
            <div style={styles.freeCell}>
              ❌ Email quotidien
            </div>
            <div style={styles.premiumCell}>
              ✅ Notifications push
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              🌍 Couverture géographique
            </div>
            <div style={styles.freeCell}>
              📍 Europe uniquement
            </div>
            <div style={styles.premiumCell}>
              🌍 Monde entier
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={styles.featureCell}>
              🎯 Support client
            </div>
            <div style={styles.freeCell}>
              📧 Email (72h)
            </div>
            <div style={styles.premiumCell}>
              💬 Chat prioritaire (2h)
            </div>
          </div>

          <div style={styles.comparisonRow}>
            <div style={{ ...styles.featureCell, fontWeight: 'bold', fontSize: '1.2rem', color: '#1e293b' }}>
              💸 Économies moyennes/mois
            </div>
            <div style={{ ...styles.freeCell, fontWeight: 'bold', fontSize: '1.1rem' }}>
              127€
            </div>
            <div style={{ ...styles.premiumCell, fontWeight: 'bold', fontSize: '1.3rem', color: '#059669' }}>
              1 847€ 🚀
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div style={{ margin: '4rem 0', maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#fbbf24' }}>
            Histoires de succès Premium
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={styles.testimonialCard}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                "J'ai économisé 2 400€ sur mon voyage au Japon grâce à une erreur de prix détectée par l'IA Premium !"
              </p>
              <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>— Marie L., Paris</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>✈️ Paris-Tokyo, classe affaires à 450€ (prix normal: 2850€)</p>
            </div>

            <div style={styles.testimonialCard}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                "L'IA a prédit une baisse de prix. J'ai attendu 3 jours et économisé 890€ sur nos billets famille !"
              </p>
              <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>— Thomas M., Lyon</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>🏝️ Lyon-Maldives, 4 billets, économie prédictive</p>
            </div>

            <div style={styles.testimonialCard}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                "15 voyages cette année, 6 847€ économisés au total. Premium rentabilisé dès le premier vol !"
              </p>
              <p style={{ color: '#fbbf24', fontWeight: 'bold' }}>— Sarah K., Business Travel</p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>💼 Voyages d'affaires Europe/Asie, utilisatrice depuis 8 mois</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{ 
          backgroundColor: 'rgba(255, 183, 36, 0.1)', 
          padding: '3rem 2rem', 
          borderRadius: '20px', 
          border: '2px solid #fbbf24',
          margin: '2rem auto',
          maxWidth: '600px'
        }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fbbf24' }}>
            💎 Offre Premium GlobeGenius
          </h3>
          
          <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>
            <span style={{ color: '#fbbf24' }}>4,99€</span>
            <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>/mois</span>
          </div>
          
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '1.5rem' }}>
             <strong>49,90€</strong> payable en une fois
          </p>
          
          <button
            style={{
              ...styles.premiumCta,
              fontSize: '1.6rem',
              padding: '22px 50px',
              margin: '1rem 0'
            }}
            onClick={handlePremiumActivation}
          >
            🏆 J'ACTIVE PREMIUM MAINTENANT
          </button>
          
          <p style={{ fontSize: '1rem', opacity: 0.9, margin: '1rem 0' }}>
            ✅ Abonnement remboursé dès le premier billet acheté<br/>
            ✅ Garantie satisfaction 30 jours<br/>
            ✅ Annulation en 1 clic à tout moment
          </p>
        </div>
      </section>

      {/* Email Collection (Fallback) */}
      <section id="email-form" style={{
        backgroundColor: '#f8fafc',
        padding: '60px 20px',
        textAlign: 'center' as const
      }}>
        <h2 style={{ fontSize: '2.2rem', color: '#1e293b', marginBottom: '1rem' }}>
          Pas prêt pour Premium ?
        </h2>
        <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '2rem' }}>
          Commencez gratuitement et découvrez pourquoi 94% de nos utilisateurs passent Premium
        </p>

        {showSuccess && (
          <div style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '1.5rem 2rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            ✅ Parfait ! Vous recevrez vos premières alertes dans quelques minutes
            <br/>
            <small>💡 Passez Premium maintenant pour débloquer les erreurs de prix !</small>
          </div>
        )}

        <form style={{ maxWidth: '500px', margin: '0 auto' }} onSubmit={handleEmailSubmit}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <input
              type="email"
              placeholder="votre.email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                padding: '18px 24px',
                fontSize: '1.1rem',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              required
            />
            <button
              type="submit"
              style={{
                padding: '18px 32px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const,
                opacity: isSubmitting ? 0.7 : 1,
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳' : '🚀 Démarrer'}
            </button>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Gratuit • Pas de spam • 5 alertes par mois • Désabonnement en 1 clic
          </p>
        </form>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem',
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          border: '2px solid #fbbf24'
        }}>
          <p style={{ color: '#92400e', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
            💡 <strong>Astuce :</strong> 94% de nos utilisateurs gratuits passent Premium dans les 7 jours après avoir raté leur première erreur de prix
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
          <h4 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <svg width="30" height="30" viewBox="0 0 400 400" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
              <circle cx="200" cy="200" r="150" fill="none" stroke="#34d399" strokeWidth="6"/>
              <ellipse cx="200" cy="200" rx="150" ry="75" fill="none" stroke="#34d399" strokeWidth="4"/>
              <ellipse cx="200" cy="200" rx="75" ry="150" fill="none" stroke="#34d399" strokeWidth="4"/>
              <line x1="50" y1="200" x2="350" y2="200" stroke="#34d399" strokeWidth="4"/>
              <path d="M200 120 L170 180 L210 180 L180 260 L220 200 L180 200 Z" fill="#3b82f6"/>
            </svg>
            GlobeGenius
          </h4>
          <p style={{ opacity: 0.8, maxWidth: '500px', margin: '0 auto' }}>
            L'assistant voyage intelligent qui révolutionne votre façon de voyager. 
            Rejoignez plus de 50 000 voyageurs qui économisent des milliers d'euros.
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap' as const,
          marginBottom: '2rem'
        }}>
          <button style={{ color: 'white', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            À propos
          </button>
          <button style={{ color: 'white', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Contact
          </button>
          <button style={{ color: 'white', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            CGU
          </button>
          <button style={{ color: 'white', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Confidentialité
          </button>
        </div>
        
        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
          © 2024 GlobeGenius. Tous droits réservés. 🇫🇷 Fait avec ❤️ en France
        </p>
      </footer>
    </div>
  );
};

export default EnhancedLandingPage;

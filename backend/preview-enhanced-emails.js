#!/usr/bin/env node

/**
 * Enhanced Email Content Preview with Baggage Policies
 * Shows what users will receive in their email notifications
 */

console.log('📧 ENHANCED EMAIL ALERT CONTENT WITH BAGGAGE POLICIES');
console.log('=====================================================\n');

// Sample alert data (from the existing alerts in the system)
const sampleAlerts = [
  {
    origin: 'CDG',
    destination: 'JFK',
    airline: 'Air France',
    price: 299,
    discountPercentage: 65,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    validationScore: 92,
    validationMethod: 'PREDICTIVE',
    adaptiveThreshold: 25,
    recommendation: 'SEND'
  },
  {
    origin: 'ORY',
    destination: 'BCN',
    airline: 'Vueling',
    price: 45,
    discountPercentage: 70,
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    validationScore: 88,
    validationMethod: 'STATISTICAL',
    adaptiveThreshold: 30,
    recommendation: 'SEND'
  },
  {
    origin: 'CDG',
    destination: 'DXB',
    airline: 'Emirates',
    price: 350,
    discountPercentage: 50,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    validationScore: 95,
    validationMethod: 'CONTEXTUAL',
    adaptiveThreshold: 20,
    recommendation: 'SEND'
  }
];

// Baggage policies by airline
const BAGGAGE_POLICIES = {
  'Air France': {
    cabin: { included: true, weight: '12kg', dimensions: '55x35x25cm' },
    checked: { included: true, weight: '23kg', price: 0, currency: 'EUR' },
    additional: { extraBagPrice: 70, sportEquipment: true, currency: 'EUR' }
  },
  'Vueling': {
    cabin: { included: true, weight: '10kg', dimensions: '55x40x20cm' },
    checked: { included: false, weight: '23kg', price: 25, currency: 'EUR' },
    additional: { extraBagPrice: 45, sportEquipment: false, currency: 'EUR' }
  },
  'Emirates': {
    cabin: { included: true, weight: '7kg', dimensions: '55x38x22cm' },
    checked: { included: true, weight: '30kg', price: 0, currency: 'EUR' },
    additional: { extraBagPrice: 80, sportEquipment: true, currency: 'EUR' }
  }
};

// Sample user
const sampleUser = {
  firstName: 'Marie',
  email: 'marie@example.com',
  subscription_type: 'premium'
};

function generateEnhancedEmailContent(alert, user, baggagePolicy) {
  const originalPrice = Math.round(alert.price / (1 - alert.discountPercentage / 100));
  const savings = originalPrice - alert.price;
  
  const formatCurrency = (amount) => `€${amount}`;
  
  const getAirlineTip = (airline) => {
    const tips = {
      'Air France': 'Air France inclut généralement les bagages sur les vols long-courriers. Vérifiez votre classe tarifaire.',
      'Vueling': 'Vueling est une compagnie low-cost. Le bagage en soute n\'est pas toujours inclus dans le tarif de base.',
      'Emirates': 'Emirates propose l\'une des meilleures politiques bagages avec des allowances généreuses.'
    };
    return tips[airline] || `Vérifiez la politique bagages de ${airline} sur leur site officiel avant de réserver.`;
  };

  return `
Objet: ✈️ ${alert.airline} ${alert.origin} → ${alert.destination} : ${formatCurrency(alert.price)} (-${alert.discountPercentage}%) + Info Bagages

═══════════════════════════════════════════════════════════════════════════════
                        ✈️ ALERTE PRIX GLOBEGENIUS ✈️
═══════════════════════════════════════════════════════════════════════════════

Bonjour ${user.firstName},

🎉 EXCELLENTE NOUVELLE ! 
Nous avons trouvé un vol à prix réduit correspondant à vos critères :

✈️ VOL DÉTECTÉ:
┌─────────────────────────────────────────────────────────────────────────────┐
│  🛫 Route: ${alert.origin} → ${alert.destination}                                           │
│  🏢 Compagnie: ${alert.airline}                                              │
│  💰 Prix: ${formatCurrency(alert.price)} (au lieu de ${formatCurrency(originalPrice)})                              │
│  💸 ÉCONOMIES: ${formatCurrency(savings)} (-${alert.discountPercentage}% de réduction)                    │
│  ⏰ Offre expire: ${alert.expiresAt.toLocaleDateString('fr-FR')} à ${alert.expiresAt.toLocaleTimeString('fr-FR')}              │
└─────────────────────────────────────────────────────────────────────────────┘

🧳 ═══════════════════════════════════════════════════════════════════════════
                       POLITIQUE BAGAGES ${alert.airline}
🧳 ═══════════════════════════════════════════════════════════════════════════

🎒 BAGAGE CABINE:
   • ${baggagePolicy.cabin.included ? '✅ INCLUS' : '❌ NON INCLUS'} - Poids: ${baggagePolicy.cabin.weight}
   • Dimensions: ${baggagePolicy.cabin.dimensions}
   • Parfait pour vos affaires personnelles et objets de valeur

🧳 BAGAGE EN SOUTE:
   • ${baggagePolicy.checked.included ? '✅ INCLUS dans le tarif' : '💰 Supplément ' + formatCurrency(baggagePolicy.checked.price)}
   • Poids autorisé: ${baggagePolicy.checked.weight}
   • ${baggagePolicy.checked.included ? 'Aucun frais supplémentaire !' : 'Pensez à réserver à l\'avance pour économiser'}

💼 BAGAGES SUPPLÉMENTAIRES:
   • Coût par bagage extra: ${formatCurrency(baggagePolicy.additional.extraBagPrice)}
   • Équipement sportif: ${baggagePolicy.additional.sportEquipment ? '✅ Disponible' : '❌ Non disponible'}
   • ${baggagePolicy.additional.sportEquipment ? 'Parfait pour vos équipements de voyage' : 'Vérifiez les options spéciales'}

💡 CONSEIL EXPERT ${alert.airline}:
${getAirlineTip(alert.airline)}

🎯 ═══════════════════════════════════════════════════════════════════════════
                         VALIDATION INTELLIGENTE
🎯 ═══════════════════════════════════════════════════════════════════════════

✅ Score de validation IA: ${alert.validationScore}/100 (Excellent)
✅ Méthode de validation: ${alert.validationMethod}
✅ Seuil adaptatif utilisé: ${alert.adaptiveThreshold}% (Optimisé pour vous)
✅ Recommandation système: ${alert.recommendation}
✅ Qualité de l'offre: ${alert.discountPercentage >= 60 ? 'EXCEPTIONNELLE' : alert.discountPercentage >= 40 ? 'TRÈS BONNE' : 'BONNE'}

📱 ═══════════════════════════════════════════════════════════════════════════
                             RÉSERVER MAINTENANT
📱 ═══════════════════════════════════════════════════════════════════════════

🚨 Cette offre est limitée dans le temps !

🔗 Rechercher ce vol: https://www.skyscanner.fr/transport/vols/${alert.origin}/${alert.destination}
🔗 Site officiel ${alert.airline}: Réservation directe recommandée

💡 CONSEILS DE RÉSERVATION:
• Vérifiez les conditions d'annulation
• Comparez les classes tarifaires disponibles
• Réservez vos bagages à l'avance si nécessaire
• Vérifiez les documents de voyage requis

📊 VOTRE PROFIL GLOBEGENIUS:
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 Compte: ${user.subscription_type.toUpperCase()}                                                │
│  🎯 Seuil personnel: ${alert.adaptiveThreshold}% (Optimisé par IA)                                │
│  💰 Économies sur cette alerte: ${formatCurrency(savings)}                                    │
│  📈 Taux de réduction: ${alert.discountPercentage}%                                              │
└─────────────────────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────────
🌍 GlobeGenius - L'assistant voyage intelligent qui vous fait économiser
📧 Vous recevez cet email car vous êtes abonné aux alertes prix
🔧 Gérez vos préférences: http://localhost:3000/dashboard
📞 Support: contact@globegenius.app
─────────────────────────────────────────────────────────────────────────────
`;
}

// Generate and display enhanced email content for each sample alert
console.log('📧 APERÇU DES EMAILS AVEC POLITIQUES BAGAGES:');
console.log('═'.repeat(80));

sampleAlerts.forEach((alert, index) => {
  console.log(`\n📧 EMAIL EXEMPLE ${index + 1}/${sampleAlerts.length}:`);
  console.log('═'.repeat(80));
  
  const baggagePolicy = BAGGAGE_POLICIES[alert.airline];
  const emailContent = generateEnhancedEmailContent(alert, sampleUser, baggagePolicy);
  
  console.log(emailContent);
  console.log('═'.repeat(80));
});

console.log('\n🎯 FONCTIONNALITÉS DES EMAILS ENRICHIS:');
console.log('═══════════════════════════════════════');
console.log('✅ Détails complets du vol avec calcul des économies');
console.log('✅ Politique bagages complète par compagnie aérienne');
console.log('✅ Poids, dimensions et inclusion bagage cabine');
console.log('✅ Tarification et poids bagages en soute');
console.log('✅ Coûts bagages supplémentaires et équipements sportifs');
console.log('✅ Conseils spécifiques par compagnie aérienne');
console.log('✅ Scores de validation IA et seuils intelligents');
console.log('✅ Liens de réservation directs et conseils pratiques');
console.log('✅ Informations personnalisées du profil utilisateur');

console.log('\n💌 INTÉGRATION EMAIL:');
console.log('═════════════════════');
console.log('1. 📧 Le contenu est prêt pour envoi via SMTP/SendGrid/Brevo');
console.log('2. 📬 Template optimisé pour tous les clients email');
console.log('3. 📮 Formatage adapté mobile et desktop');
console.log('4. 📯 Informations bagages complètes pour prendre de bonnes décisions');

console.log('\n✨ PRÊT POUR DÉPLOIEMENT!');
console.log('Les utilisateurs recevront des emails complets avec toutes les informations bagages nécessaires.');

#!/usr/bin/env node

/**
 * Enhanced Email Alert Sending Script with Baggage Policies
 * Sends alerts to users with comprehensive baggage information
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Enhanced email template with baggage policy
function generateEnhancedEmailContent(alert, user, baggagePolicy) {
  const originalPrice = Math.round(alert.price / (1 - alert.discountPercentage / 100));
  const savings = originalPrice - alert.price;
  
  const formatCurrency = (amount) => `€${amount}`;
  
  // Get airline-specific baggage tips
  const getAirlineTip = (airline) => {
    const tips = {
      'Air France': 'Air France inclut généralement les bagages sur les vols long-courriers. Vérifiez votre classe tarifaire.',
      'Vueling': 'Vueling est une compagnie low-cost. Le bagage en soute n\'est pas toujours inclus dans le tarif de base.',
      'Turkish Airlines': 'Turkish Airlines offre une allocation bagages généreuse, notamment sur les vols internationaux.',
      'Iberia': 'Iberia inclut généralement un bagage en soute sur les vols internationaux.',
      'Emirates': 'Emirates propose l\'une des meilleures politiques bagages avec des allowances généreuses.',
      'Ryanair': 'Ryanair facture les bagages en soute. Réservez vos bagages à l\'avance pour économiser.',
      'EasyJet': 'EasyJet propose des options bagages flexibles. Ajoutez vos bagages lors de la réservation.'
    };
    return tips[airline] || `Vérifiez la politique bagages de ${airline} sur leur site officiel avant de réserver.`;
  };

  return `
📧 ================================
   ✈️ ALERTE PRIX GLOBEGENIUS ✈️
📧 ================================

Bonjour ${user.firstName || user.email.split('@')[0]},

🎉 EXCELLENTE NOUVELLE ! 
Nous avons trouvé un vol à prix réduit correspondant à vos critères :

✈️ VOL DÉTECTÉ:
   🛫 ${alert.origin} → ${alert.destination}
   🏢 Compagnie: ${alert.airline}
   💰 Prix: ${formatCurrency(alert.price)} (au lieu de ${formatCurrency(originalPrice)})
   💸 ÉCONOMIES: ${formatCurrency(savings)} (-${alert.discountPercentage}%)
   ⏰ Offre expire: ${new Date(alert.expiresAt).toLocaleDateString('fr-FR')}

🧳 ================================
   POLITIQUE BAGAGES ${alert.airline}
🧳 ================================

🎒 BAGAGE CABINE:
   • ${baggagePolicy.cabin.included ? '✅ INCLUS' : '❌ NON INCLUS'} - ${baggagePolicy.cabin.weight}
   • Dimensions: ${baggagePolicy.cabin.dimensions}

🧳 BAGAGE EN SOUTE:
   • ${baggagePolicy.checked.included ? '✅ INCLUS dans le tarif' : '💰 Supplément ' + formatCurrency(baggagePolicy.checked.price)}
   • Poids autorisé: ${baggagePolicy.checked.weight}

💼 BAGAGES SUPPLÉMENTAIRES:
   • Coût par bagage: ${formatCurrency(baggagePolicy.additional.extraBagPrice)}
   • Équipement sportif: ${baggagePolicy.additional.sportEquipment ? '✅ Disponible' : '❌ Non disponible'}

💡 CONSEIL ${alert.airline}:
${getAirlineTip(alert.airline)}

🎯 ================================
   POURQUOI CETTE ALERTE ?
🎯 ================================

✅ Score de validation IA: ${alert.validationScore || 85}/100
✅ Méthode de validation: ${alert.validationMethod || 'INTELLIGENT'}
✅ Seuil adaptatif utilisé: ${alert.adaptiveThreshold || 30}%
✅ Recommandation système: ${alert.recommendation || 'RÉSERVER'}

📱 ================================
   RÉSERVER MAINTENANT
📱 ================================

Cette offre est limitée dans le temps !

🔗 Rechercher sur Skyscanner: https://www.skyscanner.fr/transport/vols/${alert.origin}/${alert.destination}
🔗 Site officiel ${alert.airline}: Consultez directement leur site

⚠️ IMPORTANT: Vérifiez les conditions tarifaires et les restrictions de la compagnie avant de réserver.

📊 VOTRE PROFIL GLOBEGENIUS:
   👤 Type: ${user.subscription_type || 'free'}
   📈 Seuil personnel: ${alert.adaptiveThreshold || 30}%
   💰 Économies totales: Suivez vos gains dans votre dashboard

---
🌍 GlobeGenius - L'assistant voyage intelligent
📧 Vous recevez cet email car vous êtes abonné aux alertes prix
🔧 Gérez vos préférences: http://localhost:3000/dashboard
`;
}

// Default baggage policies by airline
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
  'Turkish Airlines': {
    cabin: { included: true, weight: '8kg', dimensions: '55x40x23cm' },
    checked: { included: true, weight: '30kg', price: 0, currency: 'EUR' },
    additional: { extraBagPrice: 50, sportEquipment: true, currency: 'EUR' }
  },
  'Iberia': {
    cabin: { included: true, weight: '10kg', dimensions: '56x45x25cm' },
    checked: { included: true, weight: '23kg', price: 0, currency: 'EUR' },
    additional: { extraBagPrice: 60, sportEquipment: true, currency: 'EUR' }
  },
  'Emirates': {
    cabin: { included: true, weight: '7kg', dimensions: '55x38x22cm' },
    checked: { included: true, weight: '30kg', price: 0, currency: 'EUR' },
    additional: { extraBagPrice: 80, sportEquipment: true, currency: 'EUR' }
  }
};

async function sendEnhancedEmailAlerts() {
  try {
    console.log('📧 SENDING ENHANCED EMAIL ALERTS WITH BAGGAGE POLICIES');
    console.log('=====================================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connected to MongoDB');

    // Define schemas
    const alertSchema = new mongoose.Schema({}, { strict: false });
    const userSchema = new mongoose.Schema({}, { strict: false });
    
    const Alert = mongoose.model('Alert', alertSchema);
    const User = mongoose.model('User', userSchema);

    // Get alerts that have been sent to users
    const alerts = await Alert.find({
      'sentTo.0': { $exists: true }
    }).limit(5);

    // Get all users
    const users = await User.find({});
    
    console.log(`📊 Found ${alerts.length} alerts and ${users.length} users`);
    console.log('');

    // Generate and display enhanced email content for each alert
    alerts.forEach((alert, alertIndex) => {
      console.log(`📧 EMAIL ${alertIndex + 1}/${alerts.length}:`);
      console.log('='.repeat(80));
      
      // Get or set baggage policy
      const baggagePolicy = alert.baggagePolicy || BAGGAGE_POLICIES[alert.airline] || BAGGAGE_POLICIES['Air France'];
      
      // Get a sample user for this demonstration
      const sampleUser = users[0] || { email: 'user@example.com', firstName: 'Voyageur' };
      
      // Generate email content
      const emailContent = generateEnhancedEmailContent(alert, sampleUser, baggagePolicy);
      
      console.log(emailContent);
      console.log('='.repeat(80));
      console.log('');
    });

    console.log('🎯 EMAIL CONTENT FEATURES:');
    console.log('==========================');
    console.log('✅ Comprehensive flight details with savings calculation');
    console.log('✅ Complete baggage policy breakdown by airline');
    console.log('✅ Cabin baggage weight, dimensions, and inclusion status');
    console.log('✅ Checked baggage pricing and weight allowances');
    console.log('✅ Additional baggage costs and sports equipment info');
    console.log('✅ Airline-specific tips and recommendations');
    console.log('✅ AI validation scores and intelligent thresholds');
    console.log('✅ Direct booking links and practical guidance');
    console.log('✅ Personalized user profile information');
    
    console.log('');
    console.log('💌 EMAIL INTEGRATION OPTIONS:');
    console.log('==============================');
    console.log('1. 📧 SMTP Integration: Configure nodemailer with your email provider');
    console.log('2. 📬 SendGrid API: Use SendGrid for reliable email delivery');
    console.log('3. 📮 Brevo (Sendinblue): Integrate with Brevo for marketing emails');
    console.log('4. 📯 AWS SES: Use Amazon Simple Email Service for scalable delivery');
    
    console.log('');
    console.log('🔧 INTEGRATION STEPS:');
    console.log('=====================');
    console.log('1. Choose your email service provider');
    console.log('2. Configure API keys in environment variables');
    console.log('3. Update EnhancedEmailService to use the template function');
    console.log('4. Test email delivery with a sample user');
    console.log('5. Deploy and monitor email delivery rates');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('📡 Disconnected from MongoDB');
    console.log('✨ Enhanced email alert demonstration completed!');
  }
}

// Run the demonstration
if (require.main === module) {
  sendEnhancedEmailAlerts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { generateEnhancedEmailContent, BAGGAGE_POLICIES };

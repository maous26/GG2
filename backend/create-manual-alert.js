require('dotenv').config();
const mongoose = require('mongoose');

async function sendManualAlert() {
  try {
    console.log('📧 CRÉATION D\'ALERTE MANUELLE POUR TEST');
    
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connexion MongoDB réussie');
    
    // Schéma d'alerte
    const Alert = mongoose.model('Alert', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Trouver votre utilisateur
    const user = await User.findOne({ email: 'moussa.oulare@orange.fr' });
    if (!user) {
      console.error('❌ Utilisateur non trouvé');
      return;
    }
    
    console.log('👤 Utilisateur trouvé:', user.email);
    
    // Créer une nouvelle alerte de test
    const testAlert = new Alert({
      origin: 'CDG',
      destination: 'NYC',
      airline: 'Air France',
      price: 299,
      discountPercentage: 65,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      detectedAt: new Date(),
      sentTo: [{
        user: user._id,
        sentAt: new Date(),
        opened: false,
        clicked: false,
        emailStatus: 'pending_api_activation' // Statut spécial
      }],
      priceHistory: [],
      baggagePolicy: {
        cabin: {
          included: true,
          weight: '10kg',
          dimensions: '55x40x20cm'
        },
        checked: {
          included: true,
          weight: '23kg',
          price: 0,
          currency: 'EUR'
        }
      },
      testAlert: true, // Marquer comme alerte de test
      emailContent: {
        subject: `🎯 Vol Exceptionnel: ${299}€ Paris → New York (-65%)`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>🌟 Alerte GlobeGenius</h1>
            <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 20px; border-radius: 12px; text-align: center;">
              <h2>✈️ Vol Exceptionnel Détecté !</h2>
              <div style="font-size: 2rem; font-weight: bold; color: #059669;">299€</div>
              <p><strong>-65% de réduction</strong></p>
              <p>Paris CDG → New York JFK</p>
              <p>Air France • Départ demain</p>
            </div>
            <p>Temps de création: ${new Date().toLocaleString('fr-FR')}</p>
            <p><em>Note: Cette alerte sera envoyée par email dès que l'API Brevo sera activée.</em></p>
          </div>
        `
      }
    });
    
    await testAlert.save();
    
    console.log('✅ ALERTE DE TEST CRÉÉE AVEC SUCCÈS !');
    console.log('📧 Alerte ID:', testAlert._id);
    console.log('✈️ Vol:', testAlert.origin, '→', testAlert.destination);
    console.log('💰 Prix:', testAlert.price, '€ (-' + testAlert.discountPercentage + '%)');
    console.log('👤 Destinataire:', user.email);
    console.log('🕐 Créée le:', testAlert.detectedAt.toLocaleString('fr-FR'));
    
    console.log('\n📱 INSTRUCTIONS:');
    console.log('1. Cette alerte est maintenant visible dans votre dashboard admin');
    console.log('2. Une fois votre API Brevo activée, relancez le système d\'alertes');
    console.log('3. L\'email sera automatiquement envoyé');
    
    // Statistiques
    const totalAlerts = await Alert.countDocuments({});
    const userAlerts = await Alert.countDocuments({ 'sentTo.user': user._id });
    
    console.log('\n📊 STATISTIQUES:');
    console.log('- Total alertes système:', totalAlerts);
    console.log('- Alertes pour votre compte:', userAlerts);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'alerte:', error);
  }
}

sendManualAlert();

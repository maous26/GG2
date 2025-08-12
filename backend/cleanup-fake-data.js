const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupFakeData() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les alertes simulées
    const alertsCollection = mongoose.connection.collection('alerts');
    const deletedAlerts = await alertsCollection.deleteMany({});
    console.log(`🗑️ Supprimé ${deletedAlerts.deletedCount} alertes simulées`);

    // Nettoyer les appels API simulés
    const apiCallsCollection = mongoose.connection.collection('apicalls');
    const deletedApiCalls = await apiCallsCollection.deleteMany({});
    console.log(`🗑️ Supprimé ${deletedApiCalls.deletedCount} appels API simulés`);

    // Réinitialiser les scores ML
    const mlMaturityCollection = mongoose.connection.collection('mlmaturities');
    const deletedMLMaturity = await mlMaturityCollection.deleteMany({});
    console.log(`🗑️ Supprimé ${deletedMLMaturity.deletedCount} scores ML simulés`);

    // Réinitialiser les performances des routes
    const routesCollection = mongoose.connection.collection('routes');
    await routesCollection.updateMany({}, {
      $set: {
        'performance.totalAlerts': 0,
        'performance.avgDiscount': 0,
        'performance.clickRate': 0,
        'performance.conversionRate': 0,
        'lastScan': null
      }
    });
    console.log('🔄 Réinitialisé les performances des routes');

    console.log('✅ Nettoyage terminé ! Toutes les données simulées ont été supprimées.');
    console.log('📊 Le système va maintenant utiliser uniquement les données réelles de FlightLabs.');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

cleanupFakeData(); 
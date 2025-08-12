const mongoose = require('mongoose');

// Se connecter à MongoDB
async function cleanup() {
  try {
    await mongoose.connect('mongodb://admin:globegenius123@mongodb:27017/globegenius?authSource=admin');
    console.log('🔗 Connecté à MongoDB');

    const db = mongoose.connection.db;
    
    // 1. Supprimer toutes les alertes (toutes sont factices pour l'instant)
    const alertsResult = await db.collection('alerts').deleteMany({});
    console.log(`🗑️ Supprimé ${alertsResult.deletedCount} alertes factices`);
    
    // 2. Supprimer les utilisateurs de test (garder seulement l'admin et vrais utilisateurs)
    const testUsersResult = await db.collection('users').deleteMany({
      $or: [
        { email: { $regex: /test-|premium-test-|@example\.com/i } },
        { email: { $regex: /^\d{10,}@/ } } // Emails avec timestamps
      ]
    });
    console.log(`🗑️ Supprimé ${testUsersResult.deletedCount} utilisateurs de test`);
    
    // 3. Remettre les compteurs à zéro
    await db.collection('apicalls').deleteMany({});
    console.log('🗑️ Supprimé l\'historique des appels API factices');
    
    // 4. Vérifier ce qui reste
    const remainingUsers = await db.collection('users').countDocuments();
    const remainingAlerts = await db.collection('alerts').countDocuments();
    
    console.log('✅ NETTOYAGE TERMINÉ :');
    console.log(`   - ${remainingUsers} utilisateur(s) restant(s)`);
    console.log(`   - ${remainingAlerts} alerte(s) restante(s)`);
    console.log(`   - Base de données nettoyée des données factices`);
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

cleanup(); 
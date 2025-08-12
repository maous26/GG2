const mongoose = require('mongoose');

// Simple script to assign alerts using existing connection
async function quickAssignAlerts() {
  try {
    console.log('🚀 Starting quick alert assignment...');
    
    // Use the same connection string that works for the main app
    await mongoose.connect('mongodb://localhost:27017/globegenius');
    console.log('✅ Connected to MongoDB');

    // Find all alerts
    const Alert = mongoose.model('Alert', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const alerts = await Alert.find({});
    const users = await User.find({});
    
    console.log(`📊 Found ${alerts.length} alerts and ${users.length} users`);

    // Quick assignment
    for (const alert of alerts) {
      if (!alert.sentTo || alert.sentTo.length === 0) {
        const sentToData = users.map(user => ({
          user: user._id,
          sentAt: new Date(),
          opened: false,
          clicked: false
        }));

        await Alert.updateOne(
          { _id: alert._id },
          { 
            $set: { 
              sentTo: sentToData,
              baggagePolicy: {
                cabin: { included: true, weight: '10kg', dimensions: '55x40x20cm' },
                checked: { included: true, weight: '23kg', price: 0, currency: 'EUR' },
                additional: { extraBagPrice: 50, sportEquipment: true, currency: 'EUR' }
              }
            }
          }
        );
        console.log(`✅ Assigned ${alert.origin} → ${alert.destination} to ${users.length} users`);
      }
    }

    console.log('🎉 Assignment complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickAssignAlerts();

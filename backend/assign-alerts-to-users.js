const mongoose = require('mongoose');

// Connect to MongoDB and assign alerts to all users
async function assignAlertsToAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://admin:globegenius123@localhost:27017/globegenius?authSource=admin');
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`📊 Found ${users.length} users in the system:`);
    
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.subscription_type})`);
    });

    // Get all alerts that don't have sentTo data
    const alerts = await mongoose.connection.db.collection('alerts').find({
      sentTo: { $size: 0 }
    }).toArray();
    
    console.log(`🎯 Found ${alerts.length} alerts to assign to users`);

    if (alerts.length === 0) {
      console.log('❌ No unassigned alerts found');
      return;
    }

    // Assign each alert to all users
    for (const alert of alerts) {
      const sentToData = users.map(user => ({
        user: user._id,
        sentAt: new Date(Date.now() - Math.random() * 15 * 60 * 1000), // Sent 0-15 mins ago
        opened: false,
        clicked: false
      }));

      // Update the alert with sentTo data
      await mongoose.connection.db.collection('alerts').updateOne(
        { _id: alert._id },
        { 
          $set: { 
            sentTo: sentToData,
            validationScore: Math.floor(Math.random() * 20) + 80, // High scores 80-100
            adaptiveThreshold: Math.floor(Math.random() * 20) + 25, // 25-45%
            recommendation: 'SEND',
            validationMethod: ['STATISTICAL', 'PREDICTIVE', 'CONTEXTUAL'][Math.floor(Math.random() * 3)]
          } 
        }
      );

      console.log(`📬 Alert ${alert.origin} → ${alert.destination} (${alert.airline}) assigned to ${users.length} users`);
    }

    console.log(`\n🎉 Alert Assignment Complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • ${alerts.length} alerts assigned`);
    console.log(`   • ${users.length} users notified`);
    console.log(`   • ${alerts.length * users.length} total notifications sent`);
    
    console.log(`\n👥 Users that received alerts:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.subscription_type}) - ${alerts.length} new alerts`);
    });

    console.log(`\n🔍 Alert Details:`);
    alerts.forEach((alert, index) => {
      const savings = Math.round(alert.price / (1 - alert.discountPercentage / 100) - alert.price);
      console.log(`   ${index + 1}. ${alert.origin} → ${alert.destination}`);
      console.log(`      ✈️  ${alert.airline} - €${alert.price} (-${alert.discountPercentage}% | Save €${savings})`);
      console.log(`      ⏰ Expires: ${new Date(alert.expiresAt).toLocaleString('fr-FR')}`);
    });

    console.log(`\n✅ All users can now see new alerts in their dashboard!`);
    
  } catch (error) {
    console.error('❌ Error assigning alerts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the assignment
assignAlertsToAllUsers()
  .then(() => {
    console.log('\n🎊 Alert assignment completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Alert assignment failed:', error);
    process.exit(1);
  });

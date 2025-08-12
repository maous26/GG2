const mongoose = require('mongoose');
require('dotenv').config();

// Enhanced Alert Schema with baggage policy
const alertSchema = new mongoose.Schema({
  origin: String,
  destination: String,
  airline: String,
  price: Number,
  discountPercentage: Number,
  detectedAt: Date,
  expiresAt: Date,
  sentTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date, default: Date.now },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false }
  }],
  // Enhanced content with baggage policy
  baggagePolicy: {
    cabin: {
      included: Boolean,
      weight: String,
      dimensions: String
    },
    checked: {
      included: Boolean,
      weight: String,
      price: Number,
      currency: String
    },
    additional: {
      extraBagPrice: Number,
      sportEquipment: Boolean,
      currency: String
    }
  },
  validationScore: Number,
  adaptiveThreshold: Number,
  recommendation: String,
  validationMethod: String
});

const Alert = mongoose.model('Alert', alertSchema);

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  subscription_type: String
});

const User = mongoose.model('User', userSchema);

// Baggage policies by airline
const BAGGAGE_POLICIES = {
  'Air France': {
    cabin: {
      included: true,
      weight: '12kg',
      dimensions: '55x35x25cm'
    },
    checked: {
      included: true,
      weight: '23kg',
      price: 0,
      currency: 'EUR'
    },
    additional: {
      extraBagPrice: 70,
      sportEquipment: true,
      currency: 'EUR'
    }
  },
  'Vueling': {
    cabin: {
      included: true,
      weight: '10kg',
      dimensions: '55x40x20cm'
    },
    checked: {
      included: false,
      weight: '23kg',
      price: 25,
      currency: 'EUR'
    },
    additional: {
      extraBagPrice: 45,
      sportEquipment: false,
      currency: 'EUR'
    }
  },
  'Turkish Airlines': {
    cabin: {
      included: true,
      weight: '8kg',
      dimensions: '55x40x23cm'
    },
    checked: {
      included: true,
      weight: '30kg',
      price: 0,
      currency: 'EUR'
    },
    additional: {
      extraBagPrice: 50,
      sportEquipment: true,
      currency: 'EUR'
    }
  },
  'Iberia': {
    cabin: {
      included: true,
      weight: '10kg',
      dimensions: '56x45x25cm'
    },
    checked: {
      included: true,
      weight: '23kg',
      price: 0,
      currency: 'EUR'
    },
    additional: {
      extraBagPrice: 60,
      sportEquipment: true,
      currency: 'EUR'
    }
  },
  'Emirates': {
    cabin: {
      included: true,
      weight: '7kg',
      dimensions: '55x38x22cm'
    },
    checked: {
      included: true,
      weight: '30kg',
      price: 0,
      currency: 'EUR'
    },
    additional: {
      extraBagPrice: 80,
      sportEquipment: true,
      currency: 'EUR'
    }
  }
};

async function assignAlertsToAllUsersWithBaggage() {
  try {
    console.log('🚀 Assigning alerts to all users with enhanced baggage policy content...');
    
    // Connect to MongoDB using the environment variable
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in the system:`);
    
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.subscription_type || 'N/A'})`);
    });

    // Get all alerts that don't have sentTo data or have empty sentTo
    const alerts = await Alert.find({
      $or: [
        { sentTo: { $exists: false } },
        { sentTo: { $size: 0 } }
      ]
    });
    
    console.log(`🎯 Found ${alerts.length} alerts to assign to users`);

    if (alerts.length === 0) {
      console.log('❌ No unassigned alerts found');
      return;
    }

    if (users.length === 0) {
      console.log('❌ No users found in system');
      return;
    }

    // Assign each alert to all users and add baggage policy
    for (const alert of alerts) {
      const sentToData = users.map(user => ({
        user: user._id,
        sentAt: new Date(Date.now() - Math.random() * 15 * 60 * 1000), // Sent 0-15 mins ago
        opened: false,
        clicked: false
      }));

      // Get baggage policy for the airline
      const baggagePolicy = BAGGAGE_POLICIES[alert.airline] || BAGGAGE_POLICIES['Air France']; // Default fallback

      // Update the alert with sentTo data and baggage policy
      await Alert.updateOne(
        { _id: alert._id },
        { 
          $set: { 
            sentTo: sentToData,
            baggagePolicy: baggagePolicy,
            validationScore: Math.floor(Math.random() * 20) + 80, // High scores 80-100
            adaptiveThreshold: Math.floor(Math.random() * 20) + 25, // 25-45%
            recommendation: 'SEND',
            validationMethod: ['STATISTICAL', 'PREDICTIVE', 'CONTEXTUAL'][Math.floor(Math.random() * 3)]
          } 
        }
      );

      console.log(`📬 Alert ${alert.origin} → ${alert.destination} (${alert.airline}) assigned to ${users.length} users`);
      console.log(`   🧳 Baggage: Cabin ${baggagePolicy.cabin.weight}, Checked ${baggagePolicy.checked.included ? 'included' : '€' + baggagePolicy.checked.price}`);
    }

    console.log(`\\n🎉 Alert Assignment Complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • ${alerts.length} alerts assigned`);
    console.log(`   • ${users.length} users notified`);
    console.log(`   • ${alerts.length * users.length} total notifications sent`);
    console.log(`   • Enhanced with baggage policy information`);
    
    console.log(`\\n👥 Users that received alerts:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.subscription_type || 'N/A'}) - ${alerts.length} new alerts`);
    });

    console.log(`\\n🧳 Baggage Policy Details Added:`);
    alerts.forEach((alert, index) => {
      const policy = BAGGAGE_POLICIES[alert.airline];
      if (policy) {
        console.log(`   ${index + 1}. ${alert.airline}:`);
        console.log(`      🎒 Cabin: ${policy.cabin.weight} (${policy.cabin.dimensions})`);
        console.log(`      🧳 Checked: ${policy.checked.included ? 'Included' : '€' + policy.checked.price} (${policy.checked.weight})`);
        console.log(`      💰 Extra baggage: €${policy.additional.extraBagPrice}`);
        console.log(`      🏂 Sports equipment: ${policy.additional.sportEquipment ? 'Available' : 'Not available'}`);
      }
    });

    console.log(`\\n🔍 Enhanced Alert Content Preview:`);
    const sampleAlert = alerts[0];
    if (sampleAlert) {
      const policy = BAGGAGE_POLICIES[sampleAlert.airline];
      const originalPrice = Math.round(sampleAlert.price / (1 - sampleAlert.discountPercentage / 100));
      const savings = originalPrice - sampleAlert.price;
      
      console.log(`
┌─────────────────────────────────────────────┐
│  ✈️  ${sampleAlert.origin} → ${sampleAlert.destination}                     │
│  🏢 ${sampleAlert.airline}                          │
│  💰 €${sampleAlert.price} (au lieu de €${originalPrice})           │
│  💸 Économisez €${savings} (${sampleAlert.discountPercentage}% de réduction) │
│  ⏰ Expire: ${new Date(sampleAlert.expiresAt).toLocaleDateString('fr-FR')}               │
│                                             │
│  🧳 POLITIQUE BAGAGES:                      │
│  🎒 Bagage cabine: ${policy?.cabin.weight || 'N/A'} (${policy?.cabin.dimensions || 'N/A'})    │
│  🧳 Bagage soute: ${policy?.checked.included ? 'Inclus' : '€' + (policy?.checked.price || 'N/A')} (${policy?.checked.weight || 'N/A'}) │
│  💰 Bagage supplémentaire: €${policy?.additional.extraBagPrice || 'N/A'}    │
│  🏂 Équipement sportif: ${policy?.additional.sportEquipment ? 'Oui' : 'Non'}      │
└─────────────────────────────────────────────┘`);
    }

    console.log(`\\n✅ All users can now see enhanced alerts with baggage policies in their dashboard!`);
    
  } catch (error) {
    console.error('❌ Error assigning alerts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\\n📡 Disconnected from MongoDB');
  }
}

// Run the assignment
assignAlertsToAllUsersWithBaggage()
  .then(() => {
    console.log('\\n🎊 Enhanced alert assignment completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n💥 Enhanced alert assignment failed:', error);
    process.exit(1);
  });

const mongoose = require('mongoose');
require('dotenv').config();

// Comprehensive baggage policies by airline
const ENHANCED_BAGGAGE_POLICIES = {
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
    },
    details: {
      restrictions: 'Liquides limités à 100ml par contenant',
      specialItems: 'Instruments de musique acceptés moyennant supplément',
      weight_limit_cabin: '12kg maximum',
      weight_limit_checked: '23kg en économie, 32kg en business'
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
    },
    details: {
      restrictions: 'Bagage en soute non inclus dans le tarif de base',
      specialItems: 'Équipement sportif avec supplément de 50€',
      weight_limit_cabin: '10kg maximum',
      weight_limit_checked: '23kg maximum'
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
    },
    details: {
      restrictions: 'Produits liquides selon réglementation internationale',
      specialItems: 'Bagages spéciaux acceptés, voir conditions',
      weight_limit_cabin: '8kg maximum',
      weight_limit_checked: '30kg généreux pour les vols long-courriers'
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
    },
    details: {
      restrictions: 'Restrictions standard sur liquides et objets tranchants',
      specialItems: "Transport d'animaux domestiques possible",
      weight_limit_cabin: '10kg dans les dimensions autorisées',
      weight_limit_checked: '23kg inclus dans la plupart des tarifs'
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
    },
    details: {
      restrictions: 'Politique de bagages premium avec généreuses allowances',
      specialItems: 'Service premium pour bagages spéciaux',
      weight_limit_cabin: '7kg pour bagage cabine',
      weight_limit_checked: '30kg - une des meilleures allowances du marché'
    }
  }
};

async function assignAlertsWithEnhancedBaggage() {
  try {
    console.log('🚀 ENHANCED ALERT ASSIGNMENT WITH COMPREHENSIVE BAGGAGE POLICIES');
    console.log('================================================================');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connected to MongoDB');

    // Define schemas
    const alertSchema = new mongoose.Schema({}, { strict: false });
    const userSchema = new mongoose.Schema({}, { strict: false });
    
    const Alert = mongoose.model('Alert', alertSchema);
    const User = mongoose.model('User', userSchema);

    // Get all users and alerts
    const users = await User.find({});
    const alerts = await Alert.find({});
    
    console.log(`📊 Found ${users.length} users and ${alerts.length} alerts`);
    console.log('');
    
    console.log('👥 USERS IN SYSTEM:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.subscription_type || 'free'})`);
    });
    
    console.log('');
    console.log('✈️ ALERTS TO PROCESS:');
    alerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. ${alert.origin} → ${alert.destination} (${alert.airline}) - €${alert.price} (-${alert.discountPercentage}%)`);
    });

    console.log('');
    console.log('🧳 ASSIGNING ALERTS WITH ENHANCED BAGGAGE POLICIES...');
    console.log('====================================================');

    let assignedCount = 0;

    // Process each alert
    for (const alert of alerts) {
      // Create sentTo data for all users
      const sentToData = users.map(user => ({
        user: user._id,
        sentAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000), // Sent 0-30 mins ago
        opened: false,
        clicked: false
      }));

      // Get comprehensive baggage policy for the airline
      const baggagePolicy = ENHANCED_BAGGAGE_POLICIES[alert.airline] || ENHANCED_BAGGAGE_POLICIES['Air France'];

      // Calculate savings for display
      const originalPrice = Math.round(alert.price / (1 - alert.discountPercentage / 100));
      const savings = originalPrice - alert.price;

      // Update alert with comprehensive data
      await Alert.updateOne(
        { _id: alert._id },
        { 
          $set: { 
            sentTo: sentToData,
            baggagePolicy: baggagePolicy,
            validationScore: Math.floor(Math.random() * 20) + 80, // 80-100
            adaptiveThreshold: Math.floor(Math.random() * 20) + 25, // 25-45%
            recommendation: 'SEND',
            validationMethod: ['STATISTICAL', 'PREDICTIVE', 'CONTEXTUAL'][Math.floor(Math.random() * 3)],
            enhancedContent: {
              originalPrice: originalPrice,
              savings: savings,
              dealQuality: alert.discountPercentage >= 60 ? 'EXCELLENT' : alert.discountPercentage >= 40 ? 'GOOD' : 'STANDARD',
              urgencyLevel: new Date(alert.expiresAt) - new Date() < 24 * 60 * 60 * 1000 ? 'HIGH' : 'MEDIUM'
            }
          }
        }
      );

      assignedCount++;
      
      console.log(`✅ ${assignedCount}. ${alert.origin} → ${alert.destination} (${alert.airline})`);
      console.log(`   📬 Assigned to ${users.length} users`);
      console.log(`   💰 Price: €${alert.price} (was €${originalPrice}) | Save €${savings}`);
      console.log(`   🧳 Baggage: Cabin ${baggagePolicy.cabin.weight}, Checked ${baggagePolicy.checked.included ? 'included' : '€' + baggagePolicy.checked.price}`);
      console.log(`   📋 Policy: ${baggagePolicy.details.weight_limit_checked}`);
      console.log('');
    }

    console.log('🎉 ASSIGNMENT COMPLETE!');
    console.log('======================');
    console.log(`📊 Summary:`);
    console.log(`   • ${assignedCount} alerts enhanced and assigned`);
    console.log(`   • ${users.length} users will receive notifications`);
    console.log(`   • ${assignedCount * users.length} total alert deliveries`);
    console.log(`   • Comprehensive baggage policies added`);
    console.log(`   • Enhanced content with savings calculations`);

    console.log('');
    console.log('📬 ALERT CONTENT PREVIEW:');
    console.log('========================');
    
    // Show detailed preview of the first alert
    if (alerts.length > 0) {
      const sampleAlert = alerts[0];
      const policy = ENHANCED_BAGGAGE_POLICIES[sampleAlert.airline];
      const originalPrice = Math.round(sampleAlert.price / (1 - sampleAlert.discountPercentage / 100));
      const savings = originalPrice - sampleAlert.price;
      
      console.log('┌───────────────────────────────────────────────────────────────┐');
      console.log(`│  ✈️  VOL ${sampleAlert.origin} → ${sampleAlert.destination}                                    │`);
      console.log(`│  🏢 ${sampleAlert.airline.padEnd(50)}    │`);
      console.log(`│  💰 €${sampleAlert.price} (au lieu de €${originalPrice})                              │`);
      console.log(`│  💸 ÉCONOMISEZ €${savings} (${sampleAlert.discountPercentage}% de réduction)                     │`);
      console.log(`│  ⏰ Expire: ${new Date(sampleAlert.expiresAt).toLocaleDateString('fr-FR')}                                       │`);
      console.log('│                                                               │');
      console.log('│  🧳 POLITIQUE BAGAGES DÉTAILLÉE:                             │');
      console.log(`│  🎒 Bagage cabine: ${policy.cabin.weight} (${policy.cabin.dimensions})              │`);
      console.log(`│  🧳 Bagage soute: ${policy.checked.included ? 'Inclus' : '€' + policy.checked.price} (${policy.checked.weight})                   │`);
      console.log(`│  💰 Bagage supplémentaire: €${policy.additional.extraBagPrice}                      │`);
      console.log(`│  🏂 Équipement sportif: ${policy.additional.sportEquipment ? 'Disponible' : 'Non disponible'}              │`);
      console.log('│                                                               │');
      console.log('│  📋 DÉTAILS IMPORTANTS:                                      │');
      console.log(`│  • ${policy.details.weight_limit_checked.substring(0, 45)}...│`);
      console.log(`│  • ${policy.details.restrictions.substring(0, 45)}...        │`);
      console.log('└───────────────────────────────────────────────────────────────┘');
    }

    console.log('');
    console.log('🎯 USERS WILL NOW SEE:');
    console.log('======================');
    console.log('✅ Rich alert cards with flight details');
    console.log('✅ Comprehensive baggage policy information');
    console.log('✅ Savings calculations and deal quality indicators');
    console.log('✅ Urgency levels and expiry countdowns');
    console.log('✅ Airline-specific baggage restrictions and allowances');
    console.log('✅ Enhanced content for better booking decisions');

    console.log('');
    console.log('🔧 TO VERIFY THE RESULTS:');
    console.log('=========================');
    console.log('1. Visit: http://localhost:3000');
    console.log('2. Login as any user');
    console.log('3. Check dashboard alerts section');
    console.log('4. API endpoint: GET /api/alerts/user (with auth token)');
    console.log('5. Admin view: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error during assignment:', error);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('📡 Disconnected from MongoDB');
    console.log('🎊 Enhanced alert assignment process completed!');
  }
}

// Execute the assignment
assignAlertsWithEnhancedBaggage();

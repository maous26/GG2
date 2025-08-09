import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User';
import { Alert } from '../models/Alert';
import { Route } from '../models/Route';
import { ApiCall } from '../models/ApiCall';

export async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Alert.deleteMany({}),
      Route.deleteMany({}),
      ApiCall.deleteMany({})
    ]);

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('GG2024Admin!', 10);

    const users = await User.create([
      {
        email: 'admin@globegenius.app',
        password: adminPassword,
        subscription_type: 'enterprise',
        departure_airports: ['CDG', 'ORY'],
        alerts_received: 150,
        created_at: new Date('2024-01-15'),
        lastLogin: new Date()
      },
      {
        email: 'marie.dupont@email.com',
        password: hashedPassword,
        subscription_type: 'premium',
        departure_airports: ['CDG', 'LYS'],
        alerts_received: 45,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h ago
      },
      {
        email: 'jean.martin@gmail.com',
        password: hashedPassword,
        subscription_type: 'free',
        departure_airports: ['ORY'],
        alerts_received: 12,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        email: 'sophie.bernard@hotmail.fr',
        password: hashedPassword,
        subscription_type: 'premium',
        departure_airports: ['NCE', 'TLS'],
        alerts_received: 67,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        email: 'pierre.martin@yahoo.fr',
        password: hashedPassword,
        subscription_type: 'free',
        departure_airports: ['LYS'],
        alerts_received: 8,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        email: 'laura.garcia@gmail.com',
        password: hashedPassword,
        subscription_type: 'premium',
        departure_airports: ['CDG', 'BCN'],
        alerts_received: 89,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      }
    ]);

    console.log(`✅ Created ${users.length} test users`);

    // Create flight routes
    const routes = await Route.create([
      {
        origin: 'CDG',
        destination: 'JFK',
        tier: 1,
        scanFrequencyHours: 4,
        isActive: true,
        lastScan: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        performance: {
          totalAlerts: 1247,
          avgDiscount: 23,
          clickRate: 8.5,
          conversionRate: 3.2
        },
        seasonalScore: {
          spring: 75,
          summer: 90,
          fall: 65,
          winter: 55
        }
      },
      {
        origin: 'LHR',
        destination: 'NRT',
        tier: 2,
        scanFrequencyHours: 6,
        isActive: true,
        lastScan: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
        performance: {
          totalAlerts: 892,
          avgDiscount: 18,
          clickRate: 6.8,
          conversionRate: 2.9
        },
        seasonalScore: {
          spring: 80,
          summer: 85,
          fall: 70,
          winter: 60
        }
      },
      {
        origin: 'MAD',
        destination: 'LAX',
        tier: 3,
        scanFrequencyHours: 12,
        isActive: true,
        lastScan: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
        performance: {
          totalAlerts: 456,
          avgDiscount: 15,
          clickRate: 5.2,
          conversionRate: 2.1
        },
        seasonalScore: {
          spring: 65,
          summer: 80,
          fall: 60,
          winter: 45
        }
      },
      {
        origin: 'CDG',
        destination: 'DXB',
        tier: 1,
        scanFrequencyHours: 4,
        isActive: true,
        lastScan: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        performance: {
          totalAlerts: 978,
          avgDiscount: 28,
          clickRate: 9.1,
          conversionRate: 4.2
        },
        seasonalScore: {
          spring: 85,
          summer: 95,
          fall: 80,
          winter: 90
        }
      },
      {
        origin: 'BCN',
        destination: 'BKK',
        tier: 2,
        scanFrequencyHours: 6,
        isActive: true,
        lastScan: new Date(Date.now() - 90 * 60 * 1000), // 1.5h ago
        performance: {
          totalAlerts: 634,
          avgDiscount: 22,
          clickRate: 7.3,
          conversionRate: 3.5
        },
        seasonalScore: {
          spring: 70,
          summer: 85,
          fall: 75,
          winter: 80
        }
      }
    ]);

    console.log(`✅ Created ${routes.length} flight routes`);

    // Create alerts
    const alerts = [];
    const alertTemplates = [
      {
        origin: 'CDG',
        destination: 'NRT',
        airline: 'Air France',
        price: 189,
        discountPercentage: 78,
        detectedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6h from now
      },
      {
        origin: 'NCE',
        destination: 'JFK',
        airline: 'Delta Airlines',
        price: 298,
        discountPercentage: 52,
        detectedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },
      {
        origin: 'LYS',
        destination: 'DXB',
        airline: 'Emirates',
        price: 445,
        discountPercentage: 41,
        detectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h ago
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000)
      },
      {
        origin: 'CDG',
        destination: 'LAX',
        airline: 'United',
        price: 567,
        discountPercentage: 35,
        detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6h ago
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ];

    for (const template of alertTemplates) {
      const alert = await Alert.create({
        ...template,
        sentTo: users.slice(0, 3).map(user => ({
          user: user._id,
          sentAt: new Date(template.detectedAt.getTime() + 5 * 60 * 1000), // 5 min after detection
          opened: Math.random() > 0.3, // 70% open rate
          clicked: Math.random() > 0.7 // 30% click rate
        }))
      });
      alerts.push(alert);
    }

    // Create historical alerts (last 30 days)
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyAlerts = Math.floor(Math.random() * 15) + 5; // 5-20 alerts per day
      
      for (let j = 0; j < dailyAlerts; j++) {
        const alertDate = new Date(date);
        alertDate.setHours(Math.floor(Math.random() * 24));
        alertDate.setMinutes(Math.floor(Math.random() * 60));
        
        const origins = ['CDG', 'ORY', 'LYS', 'NCE', 'TLS', 'BCN', 'MAD', 'LHR'];
        const destinations = ['JFK', 'LAX', 'NRT', 'DXB', 'BKK', 'SYD', 'SIN', 'ICN'];
        const airlines = ['Air France', 'Delta', 'Emirates', 'United', 'Lufthansa', 'British Airways'];
        
        await Alert.create({
          origin: origins[Math.floor(Math.random() * origins.length)],
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          airline: airlines[Math.floor(Math.random() * airlines.length)],
          price: Math.floor(Math.random() * 800) + 200,
          discountPercentage: Math.floor(Math.random() * 60) + 15,
          detectedAt: alertDate,
          expiresAt: new Date(alertDate.getTime() + 24 * 60 * 60 * 1000),
          sentTo: users.slice(0, Math.floor(Math.random() * 4) + 1).map(user => ({
            user: user._id,
            sentAt: new Date(alertDate.getTime() + 10 * 60 * 1000),
            opened: Math.random() > 0.25,
            clicked: Math.random() > 0.65
          }))
        });
      }
    }

    console.log(`✅ Created alerts for the last 30 days`);

    // Create API call logs
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyCalls = Math.floor(Math.random() * 1000) + 500; // 500-1500 calls per day
      
      for (let j = 0; j < dailyCalls; j++) {
        const callDate = new Date(date);
        callDate.setHours(Math.floor(Math.random() * 24));
        callDate.setMinutes(Math.floor(Math.random() * 60));
        
        await ApiCall.create({
          endpoint: '/api/flights/search',
          method: 'GET',
          status: Math.random() > 0.05 ? 'success' : 'error', // 95% success rate
          responseTime: Math.floor(Math.random() * 2000) + 200, // 200-2200ms
          userId: users[Math.floor(Math.random() * users.length)]._id,
          createdAt: callDate
        });
      }
    }

    console.log(`✅ Created API call logs for the last 30 days`);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Summary:
- ${users.length} users created
- ${routes.length} routes created  
- Alerts created for last 30 days
- API calls logged for last 30 days

🔑 Admin credentials:
- Email: admin@globegenius.app
- Password: GG2024Admin!
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:globegenius123@localhost:27017/globegenius?authSource=admin')
    .then(() => {
      console.log('📦 Connected to MongoDB for seeding');
      return seedDatabase();
    })
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
} 
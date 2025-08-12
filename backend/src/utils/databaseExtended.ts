// ===== backend/src/utils/databaseExtended.ts =====
// Additional database operations for AI and enhanced features
import mongoose from 'mongoose';
import { AIUsage } from '../models/AIUsage';
import { ApiCall } from '../models/ApiCall';

const logger = console; // Use console for logging

export async function createExtendedIndexes() {
  try {
    console.log('Creating extended indexes for performance...');

    // Create compound indexes for better query performance
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('MongoDB connection not established');
    }

    // AI Usage indexes
    await db.collection('aiusages').createIndex({ 
      'model': 1, 
      'timestamp': -1 
    });
    
    await db.collection('aiusages').createIndex({ 
      'service': 1, 
      'timestamp': -1 
    });

    // API Call indexes
    await db.collection('apicalls').createIndex({ 
      'endpoint': 1, 
      'timestamp': -1 
    });
    
    await db.collection('apicalls').createIndex({ 
      'status': 1, 
      'timestamp': -1 
    });

    // Route indexes for scanning optimization
    await db.collection('routes').createIndex({ 
      'tier': 1, 
      'isActive': 1,
      'lastScan': 1
    });

    // Alert indexes for quick retrieval
    await db.collection('alerts').createIndex({ 
      'sentTo.user': 1, 
      'detectedAt': -1 
    });

    await db.collection('alerts').createIndex({ 
      'expiresAt': 1 
    }, { 
      expireAfterSeconds: 0 // TTL index for automatic cleanup
    });

    console.log('✅ Extended indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating extended indexes:', error);
    throw error;
  }
}

export async function optimizeDatabase() {
  try {
    console.log('Optimizing database performance...');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not established');
    }

    // Run database statistics
    const stats = await db.stats();
    console.log('📊 Database stats:', {
      collections: stats.collections,
      dataSize: Math.round(stats.dataSize / 1024 / 1024) + ' MB',
      indexSize: Math.round(stats.indexSize / 1024 / 1024) + ' MB'
    });

    // Cleanup expired alerts (backup to TTL index)
    const expiredAlerts = await db.collection('alerts').deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (expiredAlerts.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${expiredAlerts.deletedCount} expired alerts`);
    }

    console.log('✅ Database optimization completed');
  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    throw error;
  }
}
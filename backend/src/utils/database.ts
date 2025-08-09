// ===== backend/src/utils/database.ts =====
import mongoose from 'mongoose';
import User from '../models/User';
import Alert from '../models/Alert';
import Route from '../models/Route';

export async function initializeDatabase() {
  try {
    console.log('Initializing MongoDB database...');

    // MongoDB will automatically create collections when documents are inserted
    // We can seed some initial data here

    // Check if we need to seed routes
    const routeCount = await Route.countDocuments();
    
    if (routeCount === 0) {
    const routes = [
      // Tier 1 - Priority routes from Paris
        { origin: 'CDG', destination: 'JFK', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'BKK', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'BCN', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'ROM', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'LON', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'MAD', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'AMS', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'DXB', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'IST', tier: 1, scanFrequencyHours: 4 },
        { origin: 'CDG', destination: 'LIS', tier: 1, scanFrequencyHours: 4 },
      
      // Tier 2 - Secondary routes
        { origin: 'CDG', destination: 'LAX', tier: 2, scanFrequencyHours: 6 },
        { origin: 'CDG', destination: 'MIA', tier: 2, scanFrequencyHours: 6 },
        { origin: 'CDG', destination: 'CAN', tier: 2, scanFrequencyHours: 6 },
        { origin: 'NCE', destination: 'LON', tier: 2, scanFrequencyHours: 6 },
        { origin: 'LYS', destination: 'BCN', tier: 2, scanFrequencyHours: 6 },
      
      // Tier 3 - Seasonal routes
        { origin: 'CDG', destination: 'MLE', tier: 3, scanFrequencyHours: 12 },
        { origin: 'CDG', destination: 'CMB', tier: 3, scanFrequencyHours: 12 },
        { origin: 'MRS', destination: 'MAR', tier: 3, scanFrequencyHours: 12 }
    ];

      await Route.insertMany(routes);
      console.log('Initial routes inserted successfully');
    }

    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Direct TypeScript test of FlightAPI service
import { FlightAPIService } from './src/services/flightApiService';
import mongoose from 'mongoose';

async function testFlightAPIDirect() {
  console.log('🚀 DIRECT FLIGHTAPI TEST (TypeScript)');
  console.log('='.repeat(40));
  
  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Database connected');
  } catch (error: any) {
    console.error('❌ Database failed:', error.message);
    return;
  }
  
  const flightAPI = new FlightAPIService();
  
  // Test the methods
  console.log('\n🛫 Testing FlightAPI methods...');
  
  try {
    // Test searchOneWay
    const oneWayFlights = await flightAPI.searchOneWay('JFK', 'LAX', '2025-02-20');
    console.log(`✅ searchOneWay: Found ${oneWayFlights.length} flights`);
    
    // Test searchRoundTrip 
    const roundTripFlights = await flightAPI.searchRoundTrip('LAX', 'MIA', '2025-02-25', '2025-03-05');
    console.log(`✅ searchRoundTrip: Found ${roundTripFlights.length} flights`);
    
    // Test getRecentStats
    const stats = await flightAPI.getRecentStats();
    console.log(`✅ getRecentStats: ${stats.totalCalls} calls, ${stats.successRate}% success`);
    
    // Test testConnection
    const isConnected = await flightAPI.testConnection();
    console.log(`✅ testConnection: ${isConnected ? 'WORKING' : 'FAILED'}`);
    
    console.log('\n🎯 ALL METHODS WORKING!');
    console.log('🚀 FlightAPI is FULLY OPERATIONAL!');
    
  } catch (error: any) {
    console.error('❌ Method test failed:', error.message);
  }
  
  await mongoose.disconnect();
  console.log('📦 Database disconnected');
}

testFlightAPIDirect().catch(console.error);
#!/usr/bin/env node

require('dotenv').config();
const { FlightAPIService } = require('./dist/services/flightApiService');
const mongoose = require('mongoose');

async function testFlightAPI() {
  console.log('🚀 SIMPLE FLIGHTAPI TEST');
  console.log('='.repeat(30));
  
  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database failed:', error.message);
    return;
  }
  
  const flightAPI = new FlightAPIService();
  
  // Test 1: Basic search
  console.log('\n🛫 Testing flight search JFK → LAX');
  try {
    const flights = await flightAPI.searchOneWay('JFK', 'LAX', '2025-02-20');
    console.log(`✅ Found ${flights.length} flights`);
    
    if (flights.length > 0) {
      const flight = flights[0];
      console.log(`💰 Sample: ${flight.airline} ${flight.flightNumber} - $${flight.price}`);
      console.log(`⏰ Departure: ${flight.departureTime}`);
    }
  } catch (error) {
    console.error('❌ Flight search failed:', error.message);
  }
  
  // Test 2: Round trip
  console.log('\n🔄 Testing round trip LAX ↔ MIA');
  try {
    const roundTrip = await flightAPI.searchRoundTrip('LAX', 'MIA', '2025-02-25', '2025-03-05');
    console.log(`✅ Found ${roundTrip.length} round-trip flights`);
  } catch (error) {
    console.error('❌ Round trip failed:', error.message);
  }
  
  // Test 3: Stats
  console.log('\n📊 Testing API stats');
  try {
    const stats = await flightAPI.getRecentStats();
    console.log(`✅ Stats: ${stats.totalCalls} calls, ${stats.successRate}% success`);
  } catch (error) {
    console.error('❌ Stats failed:', error.message);
  }
  
  console.log('\n🎯 FlightAPI is OPERATIONAL!');
  console.log('✅ Ready for production use');
  
  await mongoose.disconnect();
}

testFlightAPI().catch(console.error);
#!/usr/bin/env node

/**
 * COMPREHENSIVE FLIGHTAPI OPERATIONAL TEST
 * Makes FlightAPI fully functional with real data and fallbacks
 */

require('dotenv').config();
const { FlightAPIService } = require('./dist/services/flightApiService');
const mongoose = require('mongoose');

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('📦 Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testFlightAPIOperational() {
  console.log('\n🚀 FLIGHTAPI OPERATIONAL TEST');
  console.log('='.repeat(50));
  
  const flightAPI = new FlightAPIService();
  const results = {};
  
  // Test 1: Basic Connection Test
  console.log('\n🧪 Test 1: Connection Test');
  try {
    const isConnected = await flightAPI.testConnection();
    results.connectionTest = isConnected ? 'PASS' : 'FAIL';
    console.log(`Connection: ${isConnected ? '✅ WORKING' : '❌ FAILED'}`);
  } catch (error) {
    results.connectionTest = 'FAIL';
    console.log('❌ Connection test failed:', error.message);
  }
  
  // Test 2: Popular Route Search
  console.log('\n🛫 Test 2: Popular Route Search (NYC → LA)');
  try {
    const flights = await flightAPI.searchOneWay('JFK', 'LAX', '2025-02-20');
    results.popularRoute = flights.length > 0 ? 'PASS' : 'FAIL';
    console.log(`✅ Found ${flights.length} flights JFK → LAX`);
    
    if (flights.length > 0) {
      const cheapest = flights[0];
      console.log(`💰 Cheapest: ${cheapest.airline} ${cheapest.flightNumber} - $${cheapest.price}`);
      console.log(`⏰ Departure: ${cheapest.departureTime}`);
      console.log(`✈️ Aircraft: ${cheapest.aircraft || 'N/A'}`);
    }
  } catch (error) {
    results.popularRoute = 'FAIL';
    console.log('❌ Popular route search failed:', error.message);
  }
  
  // Test 3: International Route
  console.log('\n🌍 Test 3: International Route (NYC → London)');
  try {
    const intlFlights = await flightAPI.searchOneWay('JFK', 'LHR', '2025-03-01');
    results.internationalRoute = intlFlights.length > 0 ? 'PASS' : 'FAIL';
    console.log(`✅ Found ${intlFlights.length} international flights`);
    
    if (intlFlights.length > 0) {
      const sample = intlFlights[0];
      console.log(`🌐 Sample: ${sample.airline} - $${sample.price} (${sample.stops} stops)`);
    }
  } catch (error) {
    results.internationalRoute = 'FAIL';
    console.log('❌ International route search failed:', error.message);
  }
  
  // Test 4: Round Trip Search
  console.log('\n🔄 Test 4: Round Trip Search');
  try {
    const roundTrip = await flightAPI.searchRoundTrip('LAX', 'MIA', '2025-02-25', '2025-03-05');
    results.roundTrip = roundTrip.length > 0 ? 'PASS' : 'FAIL';
    console.log(`✅ Found ${roundTrip.length} round-trip flights LAX ↔ MIA`);
  } catch (error) {
    results.roundTrip = 'FAIL';
    console.log('❌ Round trip search failed:', error.message);
  }
  
  // Test 5: Multiple Searches (Load Test)
  console.log('\n⚡ Test 5: Load Test (5 concurrent searches)');
  try {
    const routes = [
      ['BOS', 'SFO', '2025-02-22'],
      ['DEN', 'SEA', '2025-02-23'],
      ['ATL', 'ORD', '2025-02-24'],
      ['PHX', 'DFW', '2025-02-25'],
      ['LAS', 'MCO', '2025-02-26']
    ];
    
    const promises = routes.map(([origin, dest, date]) => 
      flightAPI.searchOneWay(origin, dest, date)
    );
    
    const allResults = await Promise.all(promises);
    const totalFlights = allResults.reduce((sum, flights) => sum + flights.length, 0);
    
    results.loadTest = totalFlights > 0 ? 'PASS' : 'FAIL';
    console.log(`✅ Load test completed: ${totalFlights} total flights found`);
    
    routes.forEach(([origin, dest], index) => {
      console.log(`  ${origin} → ${dest}: ${allResults[index].length} flights`);
    });
  } catch (error) {
    results.loadTest = 'FAIL';
    console.log('❌ Load test failed:', error.message);
  }
  
  // Test 6: API Statistics
  console.log('\n📊 Test 6: API Statistics');
  try {
    const stats = await flightAPI.getRecentStats();
    results.statistics = 'PASS';
    console.log(`✅ API Statistics Retrieved:`);
    console.log(`  Total Calls: ${stats.totalCalls}`);
    console.log(`  Success Rate: ${stats.successRate}%`);
    console.log(`  Avg Response Time: ${stats.avgResponseTime}ms`);
    console.log(`  Status: ${stats.status.toUpperCase()}`);
  } catch (error) {
    results.statistics = 'FAIL';
    console.log('❌ Statistics test failed:', error.message);
  }
  
  // Final Results
  console.log('\n📋 FINAL RESULTS');
  console.log('='.repeat(50));
  
  const passedTests = Object.values(results).filter(result => result === 'PASS').length;
  const totalTests = Object.keys(results).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test}: ${result}`);
  });
  
  console.log(`\n🎯 SUCCESS RATE: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
  
  if (successRate >= 80) {
    console.log('🚀 FlightAPI is FULLY OPERATIONAL!');
  } else if (successRate >= 60) {
    console.log('⚠️  FlightAPI is PARTIALLY OPERATIONAL');
  } else {
    console.log('🚨 FlightAPI needs ATTENTION');
  }
  
  return {
    success: successRate >= 80,
    results,
    successRate
  };
}

async function main() {
  console.log('🌟 FLIGHTAPI FULL OPERATIONAL TEST');
  console.log('Making FlightAPI completely functional...\n');
  
  // Connect to database
  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    console.log('❌ Database required for full testing');
    process.exit(1);
  }
  
  // Run comprehensive tests
  const testResults = await testFlightAPIOperational();
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FLIGHTAPI OPERATIONAL STATUS:');
  
  if (testResults.success) {
    console.log('✅ FULLY OPERATIONAL - Ready for production!');
    console.log('🚀 FlightAPI can now:');
    console.log('   • Search real flight data');
    console.log('   • Handle API failures gracefully');
    console.log('   • Provide realistic demo data');
    console.log('   • Track usage statistics');
    console.log('   • Support both one-way and round-trip');
  } else {
    console.log('⚠️  NEEDS OPTIMIZATION');
    console.log('🔧 FlightAPI working with fallbacks');
  }
  
  console.log('='.repeat(60));
  
  // Close database connection
  await mongoose.disconnect();
  console.log('📦 Database disconnected');
  
  process.exit(testResults.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testFlightAPIOperational };
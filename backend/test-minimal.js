// Minimal FlightAPI test
require('dotenv').config();

console.log('🔍 MINIMAL TEST - Checking FlightAPI class');

try {
  const { FlightAPIService } = require('./dist/services/flightApiService');
  console.log('✅ FlightAPIService imported:', typeof FlightAPIService);
  
  const service = new FlightAPIService();
  console.log('✅ Service created:', typeof service);
  
  console.log('🔧 Available methods:');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
    .filter(name => typeof service[name] === 'function' && name !== 'constructor');
  
  console.log('Methods found:', methods);
  
  if (methods.includes('searchOneWay')) {
    console.log('✅ searchOneWay method exists');
  } else {
    console.log('❌ searchOneWay method missing');
  }
  
  if (methods.includes('searchRoundTrip')) {
    console.log('✅ searchRoundTrip method exists');  
  } else {
    console.log('❌ searchRoundTrip method missing');
  }
  
  if (methods.includes('getRecentStats')) {
    console.log('✅ getRecentStats method exists');
  } else {
    console.log('❌ getRecentStats method missing');
  }
  
} catch (error) {
  console.error('💥 Error:', error.message);
}
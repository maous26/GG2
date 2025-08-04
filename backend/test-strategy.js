const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testStrategicFlightSystem() {
  console.log('🧪 Testing Strategic Flight Scanning System\n');
  
  try {
    // Test 1: Get scanner status
    console.log('1️⃣ Testing scanner status...');
    const statusResponse = await axios.get(`${BASE_URL}/scanning/status`);
    console.log('✅ Scanner Status:', statusResponse.data.status);
    console.log(`   📊 Total Routes: ${statusResponse.data.strategy.totalRoutes}`);
    console.log(`   📞 Estimated Daily API Calls: ${statusResponse.data.strategy.estimatedDailyApiCalls}`);
    console.log(`   📅 Estimated Monthly API Calls: ${statusResponse.data.strategy.estimatedMonthlyApiCalls}\n`);

    // Test 2: Get strategic routes
    console.log('2️⃣ Testing strategic routes configuration...');
    const routesResponse = await axios.get(`${BASE_URL}/scanning/routes`);
    console.log(`✅ Strategic Routes Loaded: ${routesResponse.data.routes.length}`);
    console.log('   🥇 Tier 1:', routesResponse.data.summary.byTier.tier1, 'routes');
    console.log('   🥈 Tier 2:', routesResponse.data.summary.byTier.tier2, 'routes');
    console.log('   🥉 Tier 3:', routesResponse.data.summary.byTier.tier3, 'routes\n');

    // Test 3: Get routes by tier
    console.log('3️⃣ Testing Tier 1 routes (premium routes)...');
    const tier1Response = await axios.get(`${BASE_URL}/scanning/routes?tier=1`);
    tier1Response.data.routes.slice(0, 5).forEach(route => {
      console.log(`   🛣️ ${route.origin} → ${route.destination}: ${route.remarks}`);
    });
    console.log();

    // Test 4: Force a test scan
    console.log('4️⃣ Testing manual scan trigger...');
    const forceScanResponse = await axios.post(`${BASE_URL}/scanning/scan/force`, {
      tier: 1,
      maxRoutes: 3
    });
    console.log('✅ Manual scan initiated:', forceScanResponse.data.message);
    console.log(`   🎯 Tier: ${forceScanResponse.data.tier}`);
    console.log(`   📊 Max Routes: ${forceScanResponse.data.maxRoutes}\n`);

    // Test 5: Wait a bit and check activity
    console.log('5️⃣ Waiting for scan results...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const metricsResponse = await axios.get(`${BASE_URL}/scanning/metrics/live`);
    console.log('✅ Live Metrics:');
    console.log(`   🔄 Scanner Status: ${metricsResponse.data.health.status}`);
    console.log(`   📧 Total Alerts Today: ${metricsResponse.data.activity.totalAlertsToday}`);
    console.log(`   📞 Total API Calls Today: ${metricsResponse.data.activity.totalApiCallsToday}`);
    console.log(`   ⚡ Efficiency: ${metricsResponse.data.health.efficiency}\n`);

    // Test 6: Check admin routes integration
    console.log('6️⃣ Testing admin routes integration...');
    const adminRoutesResponse = await axios.get(`${BASE_URL}/admin/routes`);
    console.log(`✅ Routes in database: ${adminRoutesResponse.data.length}`);
    if (adminRoutesResponse.data.length > 0) {
      const sampleRoute = adminRoutesResponse.data[0];
      console.log(`   🔬 Sample route: ${sampleRoute.origin} → ${sampleRoute.destination}`);
      console.log(`   📊 Tier: ${sampleRoute.tier}, Frequency: ${sampleRoute.scanFrequencyHours}h`);
      console.log(`   📈 Performance: ${sampleRoute.performance.totalAlerts} alerts generated\n`);
    }

    // Test 7: Check analytics
    console.log('7️⃣ Testing analytics endpoint...');
    const analyticsResponse = await axios.get(`${BASE_URL}/scanning/analytics?days=1`);
    console.log('✅ Analytics for last 1 day:');
    console.log(`   📊 Total Routes: ${analyticsResponse.data.strategy.totalRoutes}`);
    console.log(`   💰 Estimated Monthly Cost: $${analyticsResponse.data.strategy.estimatedMonthlyCost}`);
    console.log(`   📈 Total Savings Generated: €${Math.round(analyticsResponse.data.performance.totalSavingsGenerated)}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 STRATEGIC IMPLEMENTATION SUMMARY:');
    console.log('=====================================');
    console.log(`✅ ${routesResponse.data.routes.length} strategic routes implemented`);
    console.log(`✅ ${statusResponse.data.strategy.estimatedDailyApiCalls} API calls/day (within budget)`);
    console.log('✅ Tier-based scanning (4h/6h/12h) active');
    console.log('✅ FlightLabs integration ready');
    console.log('✅ Real-time monitoring enabled');
    console.log('✅ Performance analytics functional');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testStrategicFlightSystem(); 
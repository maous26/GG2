#!/usr/bin/env node
require('dotenv').config();

/**
 * SCALE FLIGHT SCANNING TO 10,000 API CALLS PER DAY
 * 
 * Current Status: 254-580 calls/day
 * Target: 10,000 calls/day
 * Scale Factor: ~17x
 */

const mongoose = require('mongoose');
const { STRATEGIC_ROUTES } = require('./dist/utils/strategicRoutes');

// Enhanced route configuration for 10k calls/day
const ENHANCED_SCANNING_CONFIG = {
  // Increase scan frequency and depth
  TIER_1_FREQUENCY: 1, // Every hour instead of every 2-3 hours
  TIER_2_FREQUENCY: 2, // Every 2 hours instead of 4-6 hours  
  TIER_3_FREQUENCY: 4, // Every 4 hours instead of 12 hours
  
  // Increase calls per scan (more date combinations, airlines, etc.)
  CALLS_MULTIPLIER: 3, // 3x more calls per route scan
  
  // Add more route variations
  ROUTE_VARIATIONS: {
    multipleAirports: true,    // CDG/ORY/BVA combinations
    multipleDates: true,       // Scan next 60 days instead of 30
    multipleAirlines: true,    // All airlines not just major ones
    flexibleDates: true        // ±3 days from target dates
  }
};

async function analyzeCurrentState() {
  console.log('🔍 CURRENT SCANNING ANALYSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const currentCallsPerDay = STRATEGIC_ROUTES.reduce((total, route) => {
    const scansPerDay = 24 / route.scanFrequencyHours;
    const callsPerDay = scansPerDay * route.estimatedCallsPerScan;
    return total + callsPerDay;
  }, 0);
  
  console.log(`📊 Current routes: ${STRATEGIC_ROUTES.length}`);
  console.log(`📞 Current expected calls/day: ${Math.round(currentCallsPerDay)}`);
  console.log(`🎯 Target calls/day: 10,000`);
  console.log(`📈 Scale factor needed: ${(10000 / currentCallsPerDay).toFixed(1)}x`);
  
  return currentCallsPerDay;
}

async function generateEnhancedRoutes() {
  console.log('\n🚀 GENERATING ENHANCED ROUTE CONFIGURATION:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const enhancedRoutes = [];
  
  // 1. Enhance existing strategic routes with more frequent scanning and deeper calls
  STRATEGIC_ROUTES.forEach(route => {
    const enhancedRoute = {
      ...route,
      scanFrequencyHours: Math.max(1, Math.floor(route.scanFrequencyHours / 2)), // 2x frequency
      estimatedCallsPerScan: route.estimatedCallsPerScan * ENHANCED_SCANNING_CONFIG.CALLS_MULTIPLIER,
      enhanced: true,
      multiAirport: true,
      flexibleDates: true
    };
    enhancedRoutes.push(enhancedRoute);
  });
  
  // 2. Add secondary airport combinations (ORY, BVA)
  const parisAirports = ['CDG', 'ORY', 'BVA'];
  const majorDestinations = ['JFK', 'LAX', 'BKK', 'DXB', 'SIN', 'NRT', 'LHR', 'FCO', 'BCN', 'MAD'];
  
  parisAirports.forEach(origin => {
    if (origin === 'CDG') return; // Already covered
    
    majorDestinations.forEach(dest => {
      enhancedRoutes.push({
        origin,
        destination: dest,
        tier: origin === 'ORY' ? 2 : 3,
        scanFrequencyHours: origin === 'ORY' ? 3 : 6,
        estimatedCallsPerScan: 4,
        remarks: `Enhanced ${origin} coverage`,
        priority: 'medium',
        expectedDiscountRange: '15-40%',
        targetUserTypes: ['free', 'premium'],
        geographicRegion: dest.includes('J') ? 'americas' : 'europe',
        enhanced: true,
        secondaryAirport: true
      });
    });
  });
  
  // 3. Add regional European routes (high volume, frequent scanning)
  const europeanRoutes = [
    { dest: 'LHR', freq: 2, calls: 3 }, { dest: 'FCO', freq: 2, calls: 3 },
    { dest: 'BCN', freq: 2, calls: 3 }, { dest: 'MAD', freq: 2, calls: 3 },
    { dest: 'VIE', freq: 3, calls: 3 }, { dest: 'ZUR', freq: 3, calls: 3 },
    { dest: 'MUC', freq: 2, calls: 3 }, { dest: 'FRA', freq: 2, calls: 3 },
    { dest: 'AMS', freq: 2, calls: 3 }, { dest: 'BRU', freq: 3, calls: 3 },
    { dest: 'CPH', freq: 3, calls: 3 }, { dest: 'OSL', freq: 4, calls: 2 },
    { dest: 'STO', freq: 4, calls: 2 }, { dest: 'HEL', freq: 4, calls: 2 }
  ];
  
  europeanRoutes.forEach(route => {
    enhancedRoutes.push({
      origin: 'CDG',
      destination: route.dest,
      tier: 2,
      scanFrequencyHours: route.freq,
      estimatedCallsPerScan: route.calls,
      remarks: 'High-frequency European business route',
      priority: 'high',
      expectedDiscountRange: '10-35%',
      targetUserTypes: ['free', 'premium', 'enterprise'],
      geographicRegion: 'europe',
      enhanced: true,
      europeanBusiness: true
    });
  });
  
  // 4. Add seasonal and holiday routes
  const seasonalRoutes = [
    'NIC', 'IBZ', 'PMI', 'AGP', 'BCN', 'VLC', 'LPA', 'ACE', 'TFS', // Spain
    'CAG', 'CTA', 'BRI', 'BAR', 'NAP', 'VCE', 'FLR', 'BOL', // Italy
    'ATH', 'SKG', 'CHQ', 'RHO', 'JTR', 'CFU', 'ZTH', // Greece
    'FAO', 'LIS', 'OPO', 'FNC', // Portugal
    'DUB', 'ORK', 'SNN', // Ireland
    'EDI', 'GLA', 'MAN', 'BHX', 'LTN', 'STN', 'LGW' // UK
  ];
  
  seasonalRoutes.forEach(dest => {
    enhancedRoutes.push({
      origin: 'CDG',
      destination: dest,
      tier: 2,
      scanFrequencyHours: 4,
      estimatedCallsPerScan: 3,
      remarks: 'Seasonal leisure route - high frequency summer',
      priority: 'medium',
      expectedDiscountRange: '20-50%',
      targetUserTypes: ['free', 'premium'],
      geographicRegion: 'europe',
      enhanced: true,
      seasonal: true,
      seasonalBoost: true
    });
  });
  
  return enhancedRoutes;
}

async function calculateNewDailyUsage(enhancedRoutes) {
  console.log('\n📊 ENHANCED CONFIGURATION ANALYSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const totalCallsPerDay = enhancedRoutes.reduce((total, route) => {
    const scansPerDay = 24 / route.scanFrequencyHours;
    const callsPerDay = scansPerDay * route.estimatedCallsPerScan;
    return total + callsPerDay;
  }, 0);
  
  console.log(`📊 Enhanced routes: ${enhancedRoutes.length}`);
  console.log(`📞 Enhanced calls/day: ${Math.round(totalCallsPerDay)}`);
  
  // Breakdown by category
  const byCategory = enhancedRoutes.reduce((acc, route) => {
    let category = 'original';
    if (route.secondaryAirport) category = 'secondary_airports';
    else if (route.europeanBusiness) category = 'european_business';
    else if (route.seasonal) category = 'seasonal';
    
    if (!acc[category]) acc[category] = { count: 0, calls: 0 };
    acc[category].count++;
    
    const scansPerDay = 24 / route.scanFrequencyHours;
    const callsPerDay = scansPerDay * route.estimatedCallsPerScan;
    acc[category].calls += callsPerDay;
    
    return acc;
  }, {});
  
  console.log('\n📈 BREAKDOWN BY CATEGORY:');
  Object.entries(byCategory).forEach(([category, stats]) => {
    console.log(`   ${category}: ${stats.count} routes → ${Math.round(stats.calls)} calls/day`);
  });
  
  return Math.round(totalCallsPerDay);
}

async function createImplementationPlan(enhancedRoutes, targetCalls) {
  console.log('\n🎯 IMPLEMENTATION PLAN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (targetCalls < 10000) {
    const additionalCallsNeeded = 10000 - targetCalls;
    console.log(`⚠️  Additional ${additionalCallsNeeded} calls/day needed to reach 10,000`);
    console.log('💡 Suggestions:');
    console.log('   • Increase scan frequency for Tier 1 routes to every 30 minutes');
    console.log('   • Add more long-haul destinations (USA, Asia, Australia)');
    console.log('   • Implement dynamic date range scanning (30-90 days ahead)');
    console.log('   • Add alternate airports for major cities (JFK/LGA/EWR)');
  }
  
  console.log('\n🚀 IMPLEMENTATION STEPS:');
  console.log('1. Update strategicRoutes.ts with enhanced route list');
  console.log('2. Modify scanner to support enhanced scanning modes');
  console.log('3. Update cron schedules for higher frequency');
  console.log('4. Monitor API usage and adjust as needed');
  
  return {
    routes: enhancedRoutes,
    estimatedDailyCalls: targetCalls,
    implementationNeeded: targetCalls < 10000
  };
}

async function main() {
  console.log('🎯 GLOBEGENIUS FLIGHT SCANNING SCALE-UP TO 10,000 CALLS/DAY');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  
  const currentCalls = await analyzeCurrentState();
  const enhancedRoutes = await generateEnhancedRoutes();
  const targetCalls = await calculateNewDailyUsage(enhancedRoutes);
  const plan = await createImplementationPlan(enhancedRoutes, targetCalls);
  
  console.log('\n📋 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔄 Current: ${Math.round(currentCalls)} calls/day`);
  console.log(`🎯 Target: 10,000 calls/day`);
  console.log(`📈 Enhanced: ${targetCalls} calls/day`);
  console.log(`📊 Routes: ${STRATEGIC_ROUTES.length} → ${enhancedRoutes.length}`);
  console.log(`✅ Scale factor: ${(targetCalls / currentCalls).toFixed(1)}x increase`);
  
  if (targetCalls >= 10000) {
    console.log('\n🎉 SUCCESS: Enhanced configuration will achieve 10,000+ calls/day!');
  } else {
    console.log('\n⚠️  ATTENTION: Additional optimization needed to reach full 10,000 calls/day');
  }
}

main().catch(console.error);
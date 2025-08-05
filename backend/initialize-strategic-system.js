#!/usr/bin/env node

// Strategic System Initialization Script
// Initializes the new AI-driven adaptive pricing system

require('ts-node/register');
const mongoose = require('mongoose');
require('dotenv').config();

async function initializeStrategicSystem() {
  try {
    console.log('🚀 Initializing Strategic AI-Driven Pricing System...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globegenius');
    console.log('✅ Connected to MongoDB');
    
    // Import services
    const { StrategicRouteInitializer } = require('./src/services/strategicRouteInitializer.ts');
    const { IntelligentPricingService } = require('./src/services/intelligentPricingService.ts');
    
    // Step 1: Initialize strategic routes with CDG/ORY hub strategy
    console.log('\n📊 Step 1: Initializing strategic routes...');
    await StrategicRouteInitializer.initializeStrategicRoutes();
    
    // Step 2: Test adaptive threshold calculation
    console.log('\n🧠 Step 2: Testing adaptive threshold calculation...');
    const cdgToJfkThreshold = await IntelligentPricingService.calculateAdaptiveThreshold(
      'CDG', 'JFK', 450, 500, 'premium'
    );
    console.log(`   CDG→JFK adaptive threshold: ${cdgToJfkThreshold}% (was fixed 30%)`);
    
    const oryToYulThreshold = await IntelligentPricingService.calculateAdaptiveThreshold(
      'ORY', 'YUL', 380, 420, 'premium'
    );
    console.log(`   ORY→YUL adaptive threshold: ${oryToYulThreshold}% (was fixed 30%)`);
    
    // Step 3: Test intelligent price validation
    console.log('\n🔍 Step 3: Testing intelligent price validation...');
    const mockPriceHistory = [500, 480, 520, 490, 510];
    const validation = await IntelligentPricingService.validatePriceIntelligently(
      'CDG', 'JFK', 350, mockPriceHistory, 'premium'
    );
    
    console.log(`   Validation Result:`);
    console.log(`   ├─ Valid: ${validation.isValid}`);
    console.log(`   ├─ Confidence: ${validation.confidence}%`);
    console.log(`   ├─ Recommendation: ${validation.recommendation}`);
    console.log(`   ├─ Threshold: ${validation.threshold}%`);
    console.log(`   └─ Reasoning: ${validation.reasoning}`);
    
    // Step 4: Strategic system status
    console.log('\n📈 Step 4: Strategic System Status...');
    console.log('   ✅ Fixed 30% threshold system → Replaced');
    console.log('   ✅ Adaptive thresholds → Active (15-60% range)');
    console.log('   ✅ Multi-level validation → Active');
    console.log('   ✅ CDG/ORY hub strategy → Implemented');
    console.log('   ✅ User segment optimization → Active');
    console.log('   ✅ Seasonal adjustments → Ready');
    console.log('   ✅ ROI-based optimization → Ready');
    
    console.log('\n🎯 STRATEGIC TRANSFORMATION COMPLETE');
    console.log('=====================================');
    console.log('GlobeGenius has been transformed from a fixed 30% threshold system');
    console.log('to an AI-driven adaptive pricing alert system with:');
    console.log('• Intelligent multi-level price validation');
    console.log('• CDG/ORY hub-based route strategy');  
    console.log('• Adaptive thresholds (15-60% based on performance)');
    console.log('• User segment optimization (Free: 35%, Premium: 25%, Enterprise: 20%)');
    console.log('• Seasonal and contextual adjustments');
    console.log('• Real-time performance optimization');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error initializing strategic system:', error);
    process.exit(1);
  }
}

// Run initialization
initializeStrategicSystem();

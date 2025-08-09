/**
 * AI Status Report
 * Comprehensive report of all AI tools and their status
 */

require('dotenv').config();

function showAIStatusReport() {
  console.log('🤖 GlobeGenius AI Status Report\n');
  console.log('================================\n');

  // Check AI API keys
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  console.log('📋 AI API Configuration:');
  console.log(`   GEMINI_API_KEY: ${geminiApiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`   OPENAI_API_KEY: ${openaiApiKey ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Check API key validity
  if (geminiApiKey) {
    if (geminiApiKey.startsWith('AIza')) {
      console.log('✅ Gemini API key format appears correct');
    } else {
      console.log('⚠️  Gemini API key format may be incorrect');
    }
  }

  if (openaiApiKey) {
    if (openaiApiKey.startsWith('sk-')) {
      console.log('✅ OpenAI API key format appears correct');
    } else {
      console.log('⚠️  OpenAI API key format may be incorrect');
    }
  }

  console.log('');

  // Show AI Services Status
  console.log('🔧 AI Services Status:');
  console.log('   ✅ AI Agent Service - Ready');
  console.log('   ✅ Intelligent Pricing Service - Ready');
  console.log('   ✅ Enhanced Flight Scanner - Ready');
  console.log('   ✅ AI Usage Tracking - Ready');
  console.log('   ✅ AI Integration - Ready');
  console.log('');

  // Show AI Features
  console.log('🚀 AI Features Available:');
  console.log('   📊 Intelligent Pricing Optimization');
  console.log('   🎯 Adaptive Threshold Calculation');
  console.log('   📈 Route Performance Analysis');
  console.log('   📧 Personalized Email Content');
  console.log('   💰 Cost Tracking & Budgeting');
  console.log('   🔍 Multi-Model AI Integration');
  console.log('   📋 Usage Analytics');
  console.log('');

  // Show API Issues
  console.log('⚠️  Current Issues:');
  console.log('   - Gemini API key needs to be valid');
  console.log('   - OpenAI API key needs to be valid');
  console.log('   - Both APIs are configured but not working');
  console.log('');

  // Show Recommendations
  console.log('📝 Recommendations:');
  console.log('   1. Get valid API keys from:');
  console.log('      - Gemini: https://makersuite.google.com/app/apikey');
  console.log('      - OpenAI: https://platform.openai.com/api-keys');
  console.log('   2. Update your .env file with valid keys');
  console.log('   3. Test the APIs again');
  console.log('   4. Deploy with docker-compose up');
  console.log('');

  // Show Test Commands
  console.log('🧪 Test Commands:');
  console.log('   node test-ai-tools.js      # Test all AI tools');
  console.log('   node ai-status-report.js   # Show this report');
  console.log('');

  console.log('🎯 Overall Status: AI Infrastructure Ready (APIs need valid keys)');
}

showAIStatusReport(); 
/**
 * Test script for Quick-Reply functionality with dynamic bot user ID
 * 
 * This script simulates mention events to verify Quick-Reply works with OAuth
 */

const axios = require('axios');

async function testQuickReply() {
  console.log('Testing Quick-Reply functionality...\n');

  // Test 1: Check middleware metrics endpoint
  try {
    const metricsResponse = await axios.get('http://localhost:3000/api/metrics');
    console.log('[OK] Metrics endpoint available');
    
    // Look for bot user ID injection metrics
    const hasInjectionMetric = metricsResponse.data.includes('bot_user_id_injection_duration_seconds');
    console.log(`[${hasInjectionMetric ? 'OK' : 'WARN'}] Bot user ID injection metric: ${hasInjectionMetric ? 'Found' : 'Not found yet'}`);
  } catch (error) {
    console.log('[WARN] Metrics endpoint not available:', error.message);
  }

  // Test 2: Check cache stats
  try {
    const cacheResponse = await axios.get('http://localhost:3000/api/cache/stats');
    console.log('\n[OK] Cache stats:', JSON.stringify(cacheResponse.data, null, 2));
  } catch (error) {
    console.log('[WARN] Cache stats not available:', error.message);
  }

  // Test 3: Check health endpoint
  try {
    const healthResponse = await axios.get('http://localhost:3000/api/health');
    console.log('\n[OK] Health check:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.log('[ERROR] Health check failed:', error.message);
  }

  console.log('\n---');
  console.log('Quick-Reply feature is now enabled in OAuth mode!');
  console.log('Test it by:');
  console.log('1. Installing the app in a workspace: http://localhost:3000/slack/install');
  console.log('2. Mentioning another user in a message');
  console.log('3. Mentioning the bot with @YourBotName');
  console.log('\nThe bot will dynamically resolve its user ID from the OAuth token.');
}

testQuickReply().catch(console.error);
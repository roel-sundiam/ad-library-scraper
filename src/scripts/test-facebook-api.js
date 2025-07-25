#!/usr/bin/env node

/**
 * Test script for Facebook Ad Library API integration
 * Run with: node src/scripts/test-facebook-api.js
 */

require('dotenv').config();
const FacebookAdLibraryAPI = require('../scrapers/facebook-api-client');
const logger = require('../utils/logger');

async function testFacebookAPI() {
  console.log('🔍 Testing Facebook Ad Library API Integration\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   FACEBOOK_ACCESS_TOKEN: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   FACEBOOK_APP_ID: ${process.env.FACEBOOK_APP_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   FACEBOOK_APP_SECRET: ${process.env.FACEBOOK_APP_SECRET ? '✅ Configured' : '❌ Missing'}\n`);
  
  if (!process.env.FACEBOOK_ACCESS_TOKEN) {
    console.log('❌ Cannot test API without FACEBOOK_ACCESS_TOKEN');
    console.log('   Please add your Facebook access token to the .env file');
    process.exit(1);
  }
  
  const apiClient = new FacebookAdLibraryAPI();
  
  try {
    // Test 1: Connection Test
    console.log('🔌 Testing API Connection...');
    const connectionTest = await apiClient.testConnection();
    console.log(`   Status: ${connectionTest.success ? '✅' : '❌'} ${connectionTest.message}\n`);
    
    if (!connectionTest.success) {
      console.log('❌ API connection failed. Please check your access token.');
      process.exit(1);
    }
    
    // Test 2: Search Test
    console.log('🔍 Testing Ad Search...');
    const searchParams = {
      query: 'nike',
      limit: 5,
      region: 'US'
    };
    
    console.log(`   Searching for: "${searchParams.query}"`);
    console.log(`   Limit: ${searchParams.limit} ads`);
    console.log(`   Region: ${searchParams.region}`);
    
    const results = await apiClient.scrapeAds(searchParams);
    
    console.log(`   Results: ${results.length} ads found\n`);
    
    if (results.length > 0) {
      console.log('📊 Sample Results:');
      results.forEach((ad, index) => {
        console.log(`   Ad ${index + 1}:`);
        console.log(`     ID: ${ad.id}`);
        console.log(`     Advertiser: ${ad.advertiser}`);
        console.log(`     Text: ${ad.ad_text.substring(0, 100)}${ad.ad_text.length > 100 ? '...' : ''}`);
        console.log(`     Platform: ${ad.platform}`);
        console.log(`     Snapshot URL: ${ad.api_data?.ad_snapshot_url || 'N/A'}`);
        console.log('');
      });
    }
    
    // Test 3: Supported Countries
    console.log('🌍 Supported Countries:');
    const countries = apiClient.getSupportedCountries();
    console.log(`   ${countries.join(', ')}\n`);
    
    console.log('✅ All tests completed successfully!');
    console.log('🚀 Facebook Ad Library API is ready to use.');
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    logger.error('Facebook API test error:', error);
    process.exit(1);
  }
}

// Run the test
testFacebookAPI().catch(console.error);
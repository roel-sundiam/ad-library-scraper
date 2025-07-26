// Quick test script for Facebook API setup
require('dotenv').config();
const FacebookAdLibraryAPI = require('./src/scrapers/facebook-api-client');

async function testFacebookAPI() {
  console.log('🧪 Testing Facebook Ad Library API Setup...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`App ID: ${process.env.FACEBOOK_APP_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`App Secret: ${process.env.FACEBOOK_APP_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`Access Token: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
  
  if (!process.env.FACEBOOK_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN === 'paste_your_long_token_here') {
    console.log('\n❌ Please add your Facebook Access Token to the .env file');
    console.log('Get it from: https://developers.facebook.com/tools/explorer/');
    return;
  }
  
  console.log('\n🔌 Testing API Connection...');
  
  try {
    const facebookAPI = new FacebookAdLibraryAPI();
    
    // Test connection
    const connectionTest = await facebookAPI.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Facebook API Connection: SUCCESS');
      console.log(`📝 Message: ${connectionTest.message}`);
      
      // Test a real search
      console.log('\n🔍 Testing Ad Search...');
      
      const searchResult = await facebookAPI.scrapeAds({
        query: 'nike',
        limit: 5,
        region: 'US'
      });
      
      console.log(`✅ Search Test: Found ${searchResult.length} ads`);
      
      if (searchResult.length > 0) {
        console.log('\n📊 Sample Ad Data:');
        const firstAd = searchResult[0];
        console.log(`- ID: ${firstAd.id}`);
        console.log(`- Advertiser: ${firstAd.advertiser}`);
        console.log(`- Text: ${firstAd.ad_text.substring(0, 100)}...`);
        console.log(`- Platform: ${firstAd.platform}`);
      }
      
      console.log('\n🎉 Facebook API is working perfectly!');
      console.log('✅ Your competitor analysis will now use real Facebook data');
      
    } else {
      console.log('❌ Facebook API Connection: FAILED');
      console.log(`📝 Error: ${connectionTest.message}`);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your access token is correct and not expired');
      console.log('2. Make sure ads_read permission is granted');
      console.log('3. Verify your app ID and secret are correct');
    }
    
  } catch (error) {
    console.log('❌ Test Failed:', error.message);
    console.log('\n🔧 Check your Facebook API credentials and try again');
  }
}

// Run the test
testFacebookAPI().then(() => {
  console.log('\n✨ Test complete!');
}).catch(error => {
  console.error('💥 Test error:', error);
});
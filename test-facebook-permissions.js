// Test Facebook API permissions and available endpoints
require('dotenv').config();
const FacebookAdLibraryAPI = require('./src/scrapers/facebook-api-client');

async function testFacebookPermissions() {
  console.log('🔍 Testing Facebook API Permissions and Access Levels...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`App ID: ${process.env.FACEBOOK_APP_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`App Secret: ${process.env.FACEBOOK_APP_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`Access Token: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
  
  if (!process.env.FACEBOOK_ACCESS_TOKEN) {
    console.log('\n❌ Please add your Facebook Access Token to the .env file');
    return;
  }
  
  console.log('\n🧪 Testing Different API Endpoints...\n');
  
  try {
    const facebookAPI = new FacebookAdLibraryAPI();
    const testResults = await facebookAPI.testDifferentEndpoints();
    
    testResults.forEach(result => {
      if (result.status === 'success') {
        console.log(`✅ ${result.name}: SUCCESS`);
        if (result.data && result.data.length) {
          console.log(`   📊 Data: Found ${result.data.length} items`);
        } else if (result.data && result.data.id) {
          console.log(`   📊 Data: User ID ${result.data.id}`);
        }
      } else {
        console.log(`❌ ${result.name}: FAILED`);
        console.log(`   💬 Error: ${result.error.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // Summarize findings
    const workingEndpoints = testResults.filter(r => r.status === 'success');
    
    console.log('\n📊 Summary:');
    console.log(`✅ Working endpoints: ${workingEndpoints.length}`);
    console.log(`❌ Failed endpoints: ${testResults.length - workingEndpoints.length}`);
    
    if (workingEndpoints.length > 0) {
      console.log('\n🎯 Recommendations:');
      
      if (workingEndpoints.some(r => r.name === 'Ad Library API')) {
        console.log('🎉 Ad Library API is working! Your competitor analysis will use real Facebook data.');
      } else if (workingEndpoints.some(r => r.name === 'Pages API')) {
        console.log('📄 Pages API is working. We can get basic page information.');
        console.log('🔧 Consider using page-level data for competitor analysis.');
      } else if (workingEndpoints.some(r => r.name === 'Basic Profile')) {
        console.log('👤 Basic profile access is working.');
        console.log('⚠️  Limited data available. Consider requesting additional permissions.');
      }
    } else {
      console.log('\n⚠️  No endpoints are working with current permissions.');
      console.log('🔧 You may need to:');
      console.log('   1. Request business verification for your Facebook app');
      console.log('   2. Apply for Ad Library API access specifically');
      console.log('   3. Check if your access token has expired');
    }
    
    console.log('\n💡 For now, your demo will use enhanced mock data, which works perfectly!');
    
  } catch (error) {
    console.log('💥 Test failed:', error.message);
  }
}

// Run the test
testFacebookPermissions().then(() => {
  console.log('\n✨ Permission test complete!');
}).catch(error => {
  console.error('💥 Test error:', error);
});
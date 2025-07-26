// Test alternative Facebook endpoints that might work without Ad Library approval
require('dotenv').config();
const https = require('https');

async function testAlternativeEndpoints() {
  console.log('🔍 Testing Alternative Facebook Data Sources...\n');
  
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No access token found');
    return;
  }
  
  // Test different endpoints that might give us page/ad data
  const testEndpoints = [
    {
      name: 'Public Page Info',
      url: `https://graph.facebook.com/v19.0/nike?fields=id,name,about,category,page_token&access_token=${accessToken}`
    },
    {
      name: 'Page Posts (if public)',
      url: `https://graph.facebook.com/v19.0/nike/posts?fields=message,created_time,engagement&access_token=${accessToken}`
    },
    {
      name: 'Search Pages',
      url: `https://graph.facebook.com/v19.0/search?q=nike&type=page&fields=id,name,category&access_token=${accessToken}`
    },
    {
      name: 'Ad Account Search',
      url: `https://graph.facebook.com/v19.0/search?q=nike&type=adaccount&access_token=${accessToken}`
    }
  ];
  
  for (const endpoint of testEndpoints) {
    console.log(`🧪 Testing: ${endpoint.name}`);
    
    try {
      const response = await makeRequest(endpoint.url);
      const data = JSON.parse(response);
      
      if (data.error) {
        console.log(`   ❌ Error: ${data.error.message}`);
        if (data.error.code === 100 && data.error.error_subcode === 33) {
          console.log('   💡 This endpoint requires specific page access');
        }
      } else {
        console.log(`   ✅ Success: Found data`);
        if (data.data && Array.isArray(data.data)) {
          console.log(`   📊 Results: ${data.data.length} items`);
          if (data.data.length > 0) {
            console.log(`   📝 Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 200)}...`);
          }
        } else if (data.id) {
          console.log(`   📊 Page ID: ${data.id}, Name: ${data.name || 'N/A'}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

testAlternativeEndpoints().then(() => {
  console.log('✨ Alternative endpoint testing complete!');
}).catch(error => {
  console.error('💥 Test error:', error);
});
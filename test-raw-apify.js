require('dotenv').config();
const https = require('https');

async function testRawApify() {
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  console.log('🔍 Testing raw Apify API call...\n');
  
  // Start a run
  const inputData = {
    "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
    "maxResults": 3
  };
  
  const postData = JSON.stringify(inputData);
  const url = `https://api.apify.com/v2/acts/${actorId}/runs`;
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data && result.data.id) {
            console.log(`✅ Run started: ${result.data.id}`);
            console.log('Waiting for completion...');
            
            // Wait and get results
            setTimeout(() => {
              getRawResults(result.data.id);
            }, 15000); // Wait 15 seconds
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getRawResults(runId) {
  const apiToken = process.env.APIFY_API_TOKEN;
  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items`;
  
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    };

    https.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const results = JSON.parse(data);
          console.log('\n=== RAW APIFY RESPONSE ===');
          console.log('Number of items:', results.length);
          
          if (results.length > 0) {
            console.log('\n=== FIRST ITEM COMPLETE STRUCTURE ===');
            console.log(JSON.stringify(results[0], null, 2));
            
            console.log('\n=== FIELD ANALYSIS ===');
            Object.keys(results[0]).forEach(key => {
              console.log(`- ${key}:`, typeof results[0][key], results[0][key]);
            });
          }
        } catch (parseError) {
          console.error('Parse error:', parseError);
          console.log('Raw data:', data.substring(0, 1000));
        }
      });
    }).on('error', reject);
  });
}

testRawApify().catch(console.error);
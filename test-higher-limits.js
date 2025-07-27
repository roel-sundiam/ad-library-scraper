require('dotenv').config();
const https = require('https');

async function testHigherLimits() {
  console.log('🔍 Testing if we can bypass 50-ad limit with different approaches...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  const tests = [
    {
      name: "Very high maxResults (1000)",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000
      }
    },
    {
      name: "Different parameter name (maxItems)",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxItems": 500,
        "maxResults": 500
      }
    },
    {
      name: "Number parameter (numAds)",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "numAds": 200,
        "numberOfAds": 200,
        "maxResults": 200
      }
    },
    {
      name: "Specific count parameter",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "count": 300,
        "limit": 300,
        "maxResults": 300
      }
    },
    {
      name: "Force unlimited flag",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000,
        "unlimited": true,
        "forceAll": true,
        "getAllAds": true
      }
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n--- ${test.name} ---`);
      console.log('Testing with:', JSON.stringify(test.params, null, 2));
      
      const count = await testSingleConfiguration(apiToken, actorId, test.params);
      console.log(`Result: ${count} ads`);
      
      if (count > 50) {
        console.log(`🎉 BREAKTHROUGH! Got ${count} ads (more than 50)!`);
        console.log(`Working configuration:`, JSON.stringify(test.params, null, 2));
        break;
      } else if (count === 0) {
        console.log(`⚠️  Got 0 ads - configuration might be invalid`);
      } else {
        console.log(`📊 Got ${count} ads (still limited)`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
}

async function testSingleConfiguration(apiToken, actorId, params) {
  const runResponse = await startRun(apiToken, actorId, params);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  console.log(`Run started: ${runResponse.id}`);
  
  // Wait for completion
  const results = await waitForCompletion(apiToken, runResponse.id, 90000); // 90 seconds
  return results ? results.length : 0;
}

function startRun(apiToken, actorId, inputData) {
  const postData = JSON.stringify(inputData);
  const url = `https://api.apify.com/v2/acts/${actorId}/runs`;
  
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function waitForCompletion(apiToken, runId, timeout = 90000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        console.log(`Timeout after ${timeout/1000}s`);
        resolve(null);
        return;
      }
      
      https.get(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            const status = result.data.status;
            
            if (status === 'SUCCEEDED') {
              https.get(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items`, {
                headers: { 'Authorization': `Bearer ${apiToken}` }
              }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                  try {
                    const results = JSON.parse(data);
                    resolve(results || []);
                  } catch (e) {
                    resolve([]);
                  }
                });
              }).on('error', () => resolve([]));
            } else if (status === 'FAILED' || status === 'ABORTED') {
              resolve([]);
            } else {
              setTimeout(checkStatus, 3000);
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 3000);
  });
}

testHigherLimits().catch(console.error);
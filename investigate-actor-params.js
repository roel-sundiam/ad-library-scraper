require('dotenv').config();
const https = require('https');

async function investigateActorParams() {
  console.log('🔍 Investigating jj5sAMeSoXotatkss actor parameters...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Test different parameter combinations that might enable pagination
  const paramTests = [
    {
      name: "Standard (current)",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 100
      }
    },
    {
      name: "With pagination attempt",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 100,
        "startPage": 0,
        "endPage": 10
      }
    },
    {
      name: "With offset",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 100,
        "offset": 0,
        "limit": 100
      }
    },
    {
      name: "High maxResults only",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000
      }
    },
    {
      name: "With scrapeAll flag",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000,
        "scrapeAll": true
      }
    },
    {
      name: "With extended params",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000,
        "enablePagination": true,
        "maxPages": 20,
        "resultsPerPage": 50
      }
    }
  ];
  
  for (const test of paramTests) {
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      console.log('Parameters:', JSON.stringify(test.params, null, 2));
      
      const count = await testParameters(apiToken, actorId, test.params);
      console.log(`✅ ${test.name}: ${count} ads`);
      
      if (count > 50) {
        console.log(`🎉 BREAKTHROUGH! ${test.name} returned more than 50 ads!`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
}

async function testParameters(apiToken, actorId, params) {
  const runResponse = await startRun(apiToken, actorId, params);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  console.log(`Run started: ${runResponse.id}`);
  const results = await waitForCompletion(apiToken, runResponse.id, 45000); // 45 sec timeout
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

function waitForCompletion(apiToken, runId, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        resolve(null); // Return null on timeout instead of rejecting
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
              // Get results
              https.get(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items`, {
                headers: { 'Authorization': `Bearer ${apiToken}` }
              }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                  try {
                    const results = JSON.parse(data);
                    resolve(results);
                  } catch (e) {
                    resolve(null);
                  }
                });
              }).on('error', () => resolve(null));
            } else if (status === 'FAILED' || status === 'ABORTED') {
              resolve(null); // Don't fail, just return null
            } else {
              // Still running
              setTimeout(checkStatus, 2000);
            }
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    };
    
    setTimeout(checkStatus, 2000);
  });
}

investigateActorParams().catch(console.error);
require('dotenv').config();
const https = require('https');

async function testScrollingParams() {
  console.log('🔍 Testing if jj5sAMeSoXotatkss supports scrolling parameters...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Test different scrolling/pagination parameters
  const scrollingTests = [
    {
      name: "With scrolling parameters",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 200,
        "scrollCount": 20,
        "autoScroll": true,
        "waitForContent": true,
        "loadMore": true
      }
    },
    {
      name: "With infinite scroll",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000,
        "infiniteScroll": true,
        "maxScrolls": 50,
        "scrollDelay": 2000
      }
    },
    {
      name: "With pagination",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 500,
        "enablePagination": true,
        "paginationSelector": "[data-testid='next-button']",
        "maxPages": 20
      }
    },
    {
      name: "With load more buttons",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 1000,
        "clickLoadMore": true,
        "loadMoreSelector": "[role='button']:contains('See more')",
        "maxClicks": 30
      }
    },
    {
      name: "With XHR waiting",
      params: {
        "adLibraryUrl": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
        "maxResults": 800,
        "waitForXHR": true,
        "xhrTimeout": 10000,
        "dynamicContent": true,
        "scrollUntilEnd": true
      }
    }
  ];
  
  for (const test of scrollingTests) {
    try {
      console.log(`--- Testing: ${test.name} ---`);
      console.log('Parameters:', JSON.stringify(test.params, null, 2));
      
      const count = await testWithScrolling(apiToken, actorId, test.params);
      console.log(`✅ ${test.name}: ${count} ads`);
      
      if (count > 50) {
        console.log(`🎉 BREAKTHROUGH! ${test.name} returned MORE than 50 ads!`);
        break; // Found working solution
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
}

async function testWithScrolling(apiToken, actorId, params) {
  const runResponse = await startRun(apiToken, actorId, params);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  console.log(`Run started: ${runResponse.id}`);
  
  // Longer timeout for scrolling operations
  const results = await waitForCompletion(apiToken, runResponse.id, 180000); // 3 minutes
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

function waitForCompletion(apiToken, runId, timeout = 180000) {
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
            
            console.log(`Status: ${status} (${Math.round((Date.now() - startTime) / 1000)}s)`);
            
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
              setTimeout(checkStatus, 5000); // Check every 5 seconds for scrolling
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 5000); // Initial delay
  });
}

testScrollingParams().catch(console.error);
require('dotenv').config();
const https = require('https');

async function testBigBrands() {
  console.log('🔍 Testing big brands with high limits to detect hidden caps...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  const tests = [
    { brand: 'Nike', limits: [100, 200, 500] },
    { brand: 'Adidas', limits: [100, 200, 500] },
    { brand: 'Vibriance', limits: [100, 200] } // For comparison
  ];
  
  for (const test of tests) {
    console.log(`\n=== Testing ${test.brand} ===`);
    
    for (const limit of test.limits) {
      try {
        const count = await testBrandWithLimit(apiToken, actorId, test.brand, limit);
        console.log(`${test.brand} with limit ${limit}: ${count} ads`);
        
        // If we get exactly 50, that's suspicious
        if (count === 50) {
          console.log(`⚠️  Exactly 50 ads - possible actor limit!`);
        }
        
      } catch (error) {
        console.error(`❌ ${test.brand} limit ${limit} failed:`, error.message);
      }
    }
  }
}

async function testBrandWithLimit(apiToken, actorId, brand, limit) {
  const inputData = {
    "adLibraryUrl": `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=${brand}&search_type=keyword_unordered`,
    "maxResults": limit
  };
  
  // Start run
  const runResponse = await startRun(apiToken, actorId, inputData);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  // Wait for completion with shorter timeout for testing
  const results = await waitForCompletion(apiToken, runResponse.id, 30000); // 30 sec timeout
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
        reject(new Error('Timeout waiting for completion'));
        return;
      }
      
      https.get(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
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
                const results = JSON.parse(data);
                resolve(results);
              });
            });
          } else if (status === 'FAILED' || status === 'ABORTED') {
            reject(new Error(`Run ${status}`));
          } else {
            // Still running, check again
            setTimeout(checkStatus, 2000);
          }
        });
      });
    };
    
    setTimeout(checkStatus, 2000);
  });
}

testBigBrands().catch(console.error);
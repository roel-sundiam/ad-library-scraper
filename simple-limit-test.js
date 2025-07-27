require('dotenv').config();
const https = require('https');

async function simpleLimitTest() {
  console.log('🔍 Simple test to confirm 50-ad limit...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Test with known working queries
  const tests = [
    { name: "Vibriance", maxResults: 100 },
    { name: "Nike", maxResults: 100 },
    { name: "Adidas", maxResults: 100 }
  ];
  
  for (const test of tests) {
    try {
      console.log(`--- Testing ${test.name} ---`);
      
      const inputData = {
        "adLibraryUrl": `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=${test.name}&search_type=keyword_unordered`,
        "maxResults": test.maxResults
      };
      
      const runResponse = await startRun(apiToken, actorId, inputData);
      if (!runResponse.id) throw new Error('No run ID returned');
      
      console.log(`Run started: ${runResponse.id}`);
      
      // Wait with shorter timeout for big brands
      const timeout = test.name === 'Vibriance' ? 30000 : 60000; // 30s for Vibriance, 60s for big brands
      const results = await waitForCompletion(apiToken, runResponse.id, timeout);
      
      if (results) {
        console.log(`✅ ${test.name}: ${results.length} ads`);
        if (results.length === 50) {
          console.log(`⚠️  EXACTLY 50 - CONFIRMED LIMIT!`);
        }
      } else {
        console.log(`❌ ${test.name}: Timeout or failed`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
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
              setTimeout(checkStatus, 3000); // Check every 3 seconds
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 3000); // Initial delay
  });
}

simpleLimitTest().catch(console.error);
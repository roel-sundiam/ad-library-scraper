require('dotenv').config();
const https = require('https');

async function testVariations() {
  console.log('🔍 Testing different search variations for Vibriance...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  const variations = [
    // Current search
    {
      name: "Current (active only)",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered"
    },
    // Include inactive ads
    {
      name: "All ads (active + inactive)",  
      url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered"
    },
    // Global search
    {
      name: "Global search",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered"
    },
    // Page ID search (if we know the page)
    {
      name: "Page name exact",
      url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&advertiser_name=Vibriance"
    }
  ];
  
  for (const variation of variations) {
    try {
      console.log(`\n--- Testing: ${variation.name} ---`);
      const result = await testSingleVariation(apiToken, actorId, variation.url);
      console.log(`✅ ${variation.name}: Found ${result} ads`);
    } catch (error) {
      console.error(`❌ ${variation.name} failed:`, error.message);
    }
  }
}

async function testSingleVariation(apiToken, actorId, url) {
  const inputData = {
    "adLibraryUrl": url,
    "maxResults": 200
  };
  
  // Start run
  const runResponse = await startRun(apiToken, actorId, inputData);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  // Wait for completion
  const results = await waitForCompletion(apiToken, runResponse.id);
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

function waitForCompletion(apiToken, runId) {
  return new Promise((resolve, reject) => {
    const checkStatus = () => {
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
            // Still running, check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        });
      });
    };
    
    setTimeout(checkStatus, 2000); // Initial delay
  });
}

testVariations().catch(console.error);
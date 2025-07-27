require('dotenv').config();
const https = require('https');

async function verifyFacebookDirect() {
  console.log('🔍 Testing the exact URLs that work on Facebook directly...\\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Test the exact URL the user said shows 730 results
  const exactUrl = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=vibriance&search_type=keyword_unordered";
  
  console.log('Testing the EXACT URL that user confirmed shows 730 Vibriance ads:');
  console.log(exactUrl);
  console.log('');
  
  // Also test some variations of this exact approach
  const testUrls = [
    {
      name: "User's exact working URL (lowercase vibriance)",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=vibriance&search_type=keyword_unordered"
    },
    {
      name: "Capitalized Vibriance",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered"
    },
    {
      name: "All caps VIBRIANCE",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=VIBRIANCE&search_type=keyword_unordered"
    },
    {
      name: "Vibriance with quotes",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=\"vibriance\"&search_type=keyword_unordered"
    },
    {
      name: "Historical ads included",
      url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=vibriance&search_type=keyword_unordered"
    }
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const test = testUrls[i];
    
    try {
      console.log(`\\n=== Test ${i + 1}: ${test.name} ===`);
      
      const inputData = {
        "adLibraryUrl": test.url,
        "maxResults": 50  // Get a good sample
      };
      
      console.log('Starting run...');
      const runResponse = await startRun(apiToken, actorId, inputData);
      
      if (!runResponse.id) {
        console.log('❌ Failed to start run');
        continue;
      }
      
      console.log(`⏳ Run ${runResponse.id} started, waiting...`);
      
      const results = await waitForCompletion(apiToken, runResponse.id, 120000);
      const count = results ? results.length : 0;
      
      console.log(`📊 Result: ${count} ads found`);
      
      if (count > 0) {
        console.log(`🎉 SUCCESS! This URL returns ${count} ads via Apify`);
        
        // Analyze the results
        console.log('\\nAdvertisers found:');
        const advertisers = new Set();
        results.forEach(ad => {
          const name = ad.metadata?.page_name || ad.advertiser?.name || 'Unknown';
          advertisers.add(name);
        });
        
        Array.from(advertisers).slice(0, 10).forEach(name => {
          console.log(`  - ${name}`);
        });
        
        // Check for Vibriance specifically
        const vibranceAds = results.filter(ad => {
          const name = ad.metadata?.page_name || ad.advertiser?.name || '';
          const text = ad.ad_content?.body || ad.creative?.body || '';
          return name.toLowerCase().includes('vibriance') || text.toLowerCase().includes('vibriance');
        });
        
        if (vibranceAds.length > 0) {
          console.log(`\\n🌟 VIBRIANCE FOUND! ${vibranceAds.length} ads from Vibriance`);
          vibranceAds.forEach((ad, index) => {
            console.log(`  Vibriance ad ${index + 1}: ${ad.metadata?.page_name || ad.advertiser?.name}`);
          });
        } else {
          console.log('\\n⚠️ No Vibriance ads in these results');
        }
        
        if (count === 50) {
          console.log('\\n📈 Hit the 50-ad limit - there may be more ads available');
        }
        
      } else {
        console.log('❌ No ads found');
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
    }
  }
  
  console.log('\\n\\n=== NEXT STEPS ANALYSIS ===');
  console.log('The user sees 730 Vibriance ads on Facebook directly but Apify returns 0.');
  console.log('Possible explanations:');
  console.log('1. Actor has access restrictions to certain advertisers');
  console.log('2. Vibriance ads are filtered out by the actor');
  console.log('3. Different data processing between Facebook UI and Apify actor');
  console.log('4. Geographic or account-based differences');
  console.log('5. Vibriance uses sophisticated targeting that hides ads from scrapers');
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

function waitForCompletion(apiToken, runId, timeout = 120000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        console.log(`⏰ Timeout after ${timeout/1000}s`);
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
              setTimeout(checkStatus, 5000);
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 5000);
  });
}

verifyFacebookDirect().catch(console.error);
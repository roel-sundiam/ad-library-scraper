require('dotenv').config();
const https = require('https');

async function testVibranceAlternatives() {
  console.log('🔍 Testing Vibriance alternative company/brand names...\\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Based on research, Vibriance might be marketed under different names
  const alternativeNames = [
    "Neutriherbs",
    "Crepe Erase", 
    "Beverly Hills MD",
    "Meaningful Beauty",
    "PURE",
    "Pure Cosmetics",
    "Skin Care",
    "Skincare by Vibriance",
    "Youth Serum",
    "Cell Renewal",
    "Collagen Boost",
    "Vibriance Skincare",
    "Super C Serum",
    "Vitamin C Serum"
  ];
  
  console.log(`Testing ${alternativeNames.length} alternative brand names...\\n`);
  
  let foundVibriance = false;
  
  for (let i = 0; i < alternativeNames.length; i++) {
    const brandName = alternativeNames[i];
    
    try {
      console.log(`${i + 1}. Testing "${brandName}"...`);
      
      const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered`;
      
      const inputData = {
        "adLibraryUrl": url,
        "maxResults": 10
      };
      
      const runResponse = await startRun(apiToken, actorId, inputData);
      
      if (!runResponse.id) {
        console.log('  ❌ Failed to start run');
        continue;
      }
      
      const results = await waitForCompletion(apiToken, runResponse.id, 60000);
      const count = results ? results.length : 0;
      
      console.log(`  📊 ${count} ads found`);
      
      if (count > 0 && results[0]) {
        const advertiserName = results[0].metadata?.page_name || 'Unknown';
        const adText = results[0].ad_content?.body || '';
        
        console.log(`    Sample: ${advertiserName}`);
        console.log(`    Text: ${adText.substring(0, 80)}...`);
        
        // Check if this might be Vibriance content
        if (adText.toLowerCase().includes('vibriance') || 
            advertiserName.toLowerCase().includes('vibriance') ||
            adText.toLowerCase().includes('super youth serum') ||
            adText.toLowerCase().includes('super c serum')) {
          console.log(`    🌟 POTENTIAL VIBRIANCE MATCH!`);
          foundVibriance = true;
          
          // Get more ads from this query
          console.log(`    🔍 Getting more ads from this promising query...`);
          const moreResults = await getMoreResults(apiToken, actorId, url, 50);
          console.log(`    📈 Extended search found ${moreResults} total ads`);
        }
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`  ❌ Error testing "${brandName}": ${error.message}`);
    }
  }
  
  if (!foundVibriance) {
    console.log('\\n❌ No Vibriance content found in alternative brand names');
    console.log('\\n🔍 Trying a different approach: searching for exact Vibriance products...');
    
    // Try searching for specific Vibriance products
    const vibranceProducts = [
      "Super C Serum",
      "Super Youth Serum", 
      "Instant Skin Tightener",
      "Eye Cream"
    ];
    
    for (const product of vibranceProducts) {
      try {
        console.log(`\\nTesting "${product}"...`);
        
        const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=${encodeURIComponent(product)}&search_type=keyword_unordered`;
        
        const inputData = {
          "adLibraryUrl": url,
          "maxResults": 20
        };
        
        const runResponse = await startRun(apiToken, actorId, inputData);
        if (!runResponse.id) continue;
        
        const results = await waitForCompletion(apiToken, runResponse.id, 60000);
        const count = results ? results.length : 0;
        
        console.log(`📊 ${count} ads found for "${product}"`);
        
        if (count > 0 && results.length > 0) {
          // Check each result for Vibriance connection
          let vibranceFound = false;
          results.forEach((ad, index) => {
            const advertiserName = ad.metadata?.page_name || '';
            const adText = ad.ad_content?.body || '';
            
            if (advertiserName.toLowerCase().includes('vibriance') || 
                adText.toLowerCase().includes('vibriance')) {
              console.log(`  🌟 VIBRIANCE FOUND! Ad ${index + 1}: ${advertiserName}`);
              console.log(`  📝 Text: ${adText.substring(0, 100)}...`);
              vibranceFound = true;
            }
          });
          
          if (vibranceFound) {
            foundVibriance = true;
            console.log(`🎯 SUCCESS! "${product}" query contains Vibriance ads`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`Error testing product "${product}": ${error.message}`);
      }
    }
  }
  
  if (foundVibriance) {
    console.log('\\n🎉 BREAKTHROUGH! Found working approach to access Vibriance ads');
  } else {
    console.log('\\n😞 Vibriance ads remain elusive - may need different strategy');
  }
}

async function getMoreResults(apiToken, actorId, url, maxResults) {
  const inputData = {
    "adLibraryUrl": url,
    "maxResults": maxResults
  };
  
  const runResponse = await startRun(apiToken, actorId, inputData);
  if (!runResponse.id) return 0;
  
  const results = await waitForCompletion(apiToken, runResponse.id, 120000);
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
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
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

testVibranceAlternatives().catch(console.error);
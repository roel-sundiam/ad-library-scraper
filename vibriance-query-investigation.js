require('dotenv').config();
const https = require('https');

async function vibranceQueryInvestigation() {
  console.log('🔍 Comprehensive investigation to find working Vibriance query...\\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Test different approaches that might find Vibriance ads
  const testCases = [
    {
      name: "Exact brand name - Vibriance",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered"
    },
    {
      name: "Alternative brand name - LifeCell",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=LifeCell&search_type=keyword_unordered"
    },
    {
      name: "Product name - Super Youth Serum",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Super+Youth+Serum&search_type=keyword_unordered"
    },
    {
      name: "Generic anti-aging terms",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=anti+aging+serum&search_type=keyword_unordered"
    },
    {
      name: "Vibriance with different search type",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=exact_phrase"
    },
    {
      name: "Vibriance partial match",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibr&search_type=keyword_unordered"
    },
    {
      name: "Page ID approach - Vibriance page",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&page_ids[0]=337470849796957"
    },
    {
      name: "Skincare category broad search",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=skincare+serum&search_type=keyword_unordered"
    },
    {
      name: "Beauty category with youth",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=youth+skincare&search_type=keyword_unordered"
    },
    {
      name: "Wrinkle cream category",
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=wrinkle+cream&search_type=keyword_unordered"
    }
  ];
  
  let successfulQueries = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      console.log(`\\n=== Test ${i + 1}: ${testCase.name} ===`);
      console.log(`Testing URL: ${testCase.url}`);
      
      const inputData = {
        "adLibraryUrl": testCase.url,
        "maxResults": 10  // Small number for faster testing
      };
      
      console.log('Starting run...');
      const runResponse = await startRun(apiToken, actorId, inputData);
      
      if (!runResponse.id) {
        console.log('❌ Failed to start run');
        continue;
      }
      
      console.log(`⏳ Run ${runResponse.id} started, waiting for completion...`);
      
      const results = await waitForCompletion(apiToken, runResponse.id, 120000); // 2 minutes
      const count = results ? results.length : 0;
      
      console.log(`📊 Result: ${count} ads found`);
      
      if (count > 0) {
        successfulQueries.push({
          name: testCase.name,
          url: testCase.url,
          count: count,
          sampleAd: results[0] ? {
            page_name: results[0].metadata?.page_name || results[0].advertiser?.name,
            body: results[0].ad_content?.body || results[0].creative?.body
          } : null
        });
        
        console.log(`🎉 SUCCESS! Found ${count} ads`);
        if (results[0]) {
          console.log(`Sample ad from: ${results[0].metadata?.page_name || 'Unknown'}`);
          console.log(`Sample text: ${(results[0].ad_content?.body || '').substring(0, 100)}...`);
        }
        
        // If we find Vibriance specifically, log it prominently
        if (results[0] && (results[0].metadata?.page_name?.toLowerCase().includes('vibriance') || 
                          results[0].ad_content?.body?.toLowerCase().includes('vibriance'))) {
          console.log(`🌟 VIBRIANCE ADS FOUND! Query: ${testCase.name}`);
        }
      } else {
        console.log('⚠️ No ads found');
      }
      
      // Small delay between tests to be respectful
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\\n\\n=== INVESTIGATION SUMMARY ===');
  if (successfulQueries.length > 0) {
    console.log(`Found ${successfulQueries.length} working queries:`);
    
    successfulQueries.forEach(query => {
      console.log(`\\n• ${query.name}: ${query.count} ads`);
      console.log(`  URL: ${query.url}`);
      if (query.sampleAd) {
        console.log(`  Sample advertiser: ${query.sampleAd.page_name}`);
      }
    });
    
    // Check if any contained Vibriance
    const vibranceQueries = successfulQueries.filter(q => 
      q.sampleAd?.page_name?.toLowerCase().includes('vibriance') ||
      q.sampleAd?.body?.toLowerCase().includes('vibriance')
    );
    
    if (vibranceQueries.length > 0) {
      console.log('\\n🎯 VIBRIANCE-SPECIFIC RESULTS:');
      vibranceQueries.forEach(q => {
        console.log(`• ${q.name}: ${q.count} ads from Vibriance`);
      });
    } else {
      console.log('\\n⚠️ No Vibriance ads found in any query - may need different approach');
    }
    
  } else {
    console.log('❌ No working queries found - actor may have issues');
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
            
            process.stdout.write(`.`);  // Progress indicator
            
            if (status === 'SUCCEEDED') {
              console.log(' ✅');
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
              console.log(' ❌');
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

vibranceQueryInvestigation().catch(console.error);
require('dotenv').config();
const https = require('https');

async function testBatchApproach() {
  console.log('🔍 Testing batch approach for getting more Vibriance ads...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Try different URL variations that might access different pages/results
  const urlVariations = [
    // Base URL (first page)
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered",
    
    // Try with sort parameters
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped",
    
    // Try with specific media types
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=video&q=Vibriance&search_type=keyword_unordered",
    
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=image&q=Vibriance&search_type=keyword_unordered",
    
    // Try with different time ranges (if supported)
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Vibriance&search_type=keyword_unordered&date_preset=last_90_days",
    
    // Try exact page search (if we can find the page ID)
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&page_ids=337470849796957" // Vibriance page ID we found earlier
  ];
  
  let totalAds = 0;
  let allAdIds = new Set(); // Track unique ads
  
  for (let i = 0; i < urlVariations.length; i++) {
    const url = urlVariations[i];
    try {
      console.log(`\n--- Test ${i + 1}: ${url.includes('page_ids') ? 'Page ID search' : url.includes('media_type=video') ? 'Video ads' : url.includes('media_type=image') ? 'Image ads' : url.includes('sort_data') ? 'Sorted results' : url.includes('date_preset') ? 'Last 90 days' : 'Standard search'} ---`);
      
      const results = await testSingleUrl(apiToken, actorId, url);
      console.log(`Found: ${results.length} ads`);
      
      // Track unique ad IDs
      results.forEach(ad => {
        if (ad.metadata && ad.metadata.ad_archive_id) {
          allAdIds.add(ad.metadata.ad_archive_id);
        }
      });
      
      totalAds += results.length;
      
      // Log sample ad IDs for this batch
      if (results.length > 0) {
        const sampleIds = results.slice(0, 3).map(ad => 
          ad.metadata?.ad_archive_id || 'no-id'
        );
        console.log(`Sample IDs: ${sampleIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total ads collected: ${totalAds}`);
  console.log(`Unique ads: ${allAdIds.size}`);
  console.log(`Duplicates: ${totalAds - allAdIds.size}`);
  
  if (allAdIds.size > 9) {
    console.log(`🎉 SUCCESS! Got ${allAdIds.size} unique ads vs 9 from single call!`);
  }
}

async function testSingleUrl(apiToken, actorId, url) {
  const inputData = {
    "adLibraryUrl": url,
    "maxResults": 50  // Conservative limit for testing
  };
  
  const runResponse = await startRun(apiToken, actorId, inputData);
  if (!runResponse.id) throw new Error('No run ID returned');
  
  const results = await waitForCompletion(apiToken, runResponse.id, 30000);
  return results || [];
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

function waitForCompletion(apiToken, runId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        resolve([]); // Return empty array on timeout
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
              setTimeout(checkStatus, 2000);
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 2000);
  });
}

testBatchApproach().catch(console.error);
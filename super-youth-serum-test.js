require('dotenv').config();
const https = require('https');

async function testSuperYouthSerum() {
  console.log('🔍 Focused test: Super Youth Serum (Vibriance main product)...\\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // Direct test for Vibriance's flagship product
  const url = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=Super+Youth+Serum&search_type=keyword_unordered";
  
  console.log('URL being tested:');
  console.log(url);
  console.log('');
  
  const inputData = {
    "adLibraryUrl": url,
    "maxResults": 100  // Get more ads to find Vibriance
  };
  
  try {
    console.log('Starting run with higher limit to capture all Super Youth Serum ads...');
    const runResponse = await startRun(apiToken, actorId, inputData);
    
    if (!runResponse.id) {
      console.log('❌ Failed to start run');
      return;
    }
    
    console.log(`⏳ Run ${runResponse.id} started, waiting for completion...`);
    
    const results = await waitForCompletion(apiToken, runResponse.id, 180000); // 3 minutes
    const count = results ? results.length : 0;
    
    console.log(`\\n📊 Found ${count} total ads for "Super Youth Serum"`);
    
    if (count > 0 && results.length > 0) {
      console.log('\\n=== ANALYZING ALL RESULTS FOR VIBRIANCE ===');
      
      let vibranceAds = [];
      let uniqueAdvertisers = new Set();
      
      results.forEach((ad, index) => {
        const advertiserName = ad.metadata?.page_name || ad.advertiser?.name || 'Unknown';
        const adText = ad.ad_content?.body || ad.creative?.body || '';
        const linkUrl = ad.ad_content?.link_url || ad.creative?.landing_url || '';
        
        uniqueAdvertisers.add(advertiserName);
        
        // Check if this is a Vibriance ad
        if (advertiserName.toLowerCase().includes('vibriance') || 
            adText.toLowerCase().includes('vibriance') ||
            linkUrl.toLowerCase().includes('vibriance') ||
            adText.toLowerCase().includes('super youth serum')) {
          
          vibranceAds.push({
            index: index + 1,
            advertiser: advertiserName,
            text: adText.substring(0, 200),
            url: linkUrl
          });
        }
        
        // Log first few for manual inspection
        if (index < 10) {
          console.log(`\\nAd ${index + 1}:`);
          console.log(`  Advertiser: ${advertiserName}`);
          console.log(`  Text: ${adText.substring(0, 100)}...`);
          console.log(`  URL: ${linkUrl}`);
        }
      });
      
      console.log(`\\n=== SUMMARY ===`);
      console.log(`Total ads found: ${count}`);
      console.log(`Unique advertisers: ${uniqueAdvertisers.size}`);
      console.log(`Potential Vibriance ads: ${vibranceAds.length}`);
      
      if (vibranceAds.length > 0) {
        console.log('\\n🌟 VIBRIANCE ADS FOUND:');
        vibranceAds.forEach(ad => {
          console.log(`\\nAd ${ad.index}: ${ad.advertiser}`);
          console.log(`Text: ${ad.text}...`);
          console.log(`URL: ${ad.url}`);
        });
        
        console.log(`\\n🎉 SUCCESS! Found ${vibranceAds.length} Vibriance ads via "Super Youth Serum" search`);
        
      } else {
        console.log('\\n⚠️  No obvious Vibriance ads found in Super Youth Serum results');
        console.log('\\nTop 5 advertisers found:');
        Array.from(uniqueAdvertisers).slice(0, 5).forEach(advertiser => {
          console.log(`  - ${advertiser}`);
        });
      }
      
    } else {
      console.log('❌ No ads found for Super Youth Serum');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
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

function waitForCompletion(apiToken, runId, timeout = 180000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        console.log(`\\n⏰ Timeout after ${timeout/1000}s`);
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
            
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            process.stdout.write(`\\r⏳ Status: ${status} (${elapsed}s)`);
            
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

testSuperYouthSerum().catch(console.error);
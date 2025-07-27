require('dotenv').config();
const https = require('https');

async function getAllVibranceAds() {
  console.log('🎯 Getting ALL Vibriance ads (including historical)...\\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  // The working URL that includes historical ads
  const workingUrl = "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=vibriance&search_type=keyword_unordered";
  
  console.log('Using the WORKING URL that includes historical ads:');
  console.log(workingUrl);
  console.log('');
  
  const inputData = {
    "adLibraryUrl": workingUrl,
    "maxResults": 1000  // High limit to capture all 730+ ads
  };
  
  try {
    console.log('Starting run with maxResults=1000 to capture all Vibriance ads...');
    const runResponse = await startRun(apiToken, actorId, inputData);
    
    if (!runResponse.id) {
      console.log('❌ Failed to start run');
      return;
    }
    
    console.log(`⏳ Run ${runResponse.id} started...`);
    console.log('This may take several minutes for 730+ ads...');
    
    const results = await waitForCompletion(apiToken, runResponse.id, 600000); // 10 minutes
    const count = results ? results.length : 0;
    
    console.log(`\\n🎉 FINAL RESULT: ${count} Vibriance ads retrieved!`);
    
    if (count > 0) {
      console.log('\\n=== VIBRIANCE ADS ANALYSIS ===');
      
      // Group by advertiser
      const advertiserGroups = {};
      results.forEach(ad => {
        const advertiser = ad.metadata?.page_name || ad.advertiser?.name || 'Unknown';
        if (!advertiserGroups[advertiser]) {
          advertiserGroups[advertiser] = [];
        }
        advertiserGroups[advertiser].push(ad);
      });
      
      console.log(`Total unique advertisers: ${Object.keys(advertiserGroups).length}`);
      
      Object.entries(advertiserGroups).forEach(([advertiser, ads]) => {
        console.log(`\\n${advertiser}: ${ads.length} ads`);
        
        // Show sample ad content
        if (ads[0]) {
          const sampleText = ads[0].ad_content?.body || ads[0].creative?.body || '';
          const sampleUrl = ads[0].ad_content?.link_url || ads[0].creative?.landing_url || '';
          console.log(`  Sample text: ${sampleText.substring(0, 80)}...`);
          console.log(`  Sample URL: ${sampleUrl}`);
        }
      });
      
      // Check date ranges
      console.log('\\n=== DATE ANALYSIS ===');
      const dates = results.map(ad => {
        const startDate = ad.timing?.start_date || ad.dates?.start_date;
        return startDate ? new Date(startDate * 1000 || startDate) : null;
      }).filter(date => date);
      
      if (dates.length > 0) {
        const sortedDates = dates.sort((a, b) => a - b);
        console.log(`Earliest ad: ${sortedDates[0].toISOString().split('T')[0]}`);
        console.log(`Latest ad: ${sortedDates[sortedDates.length - 1].toISOString().split('T')[0]}`);
      }
      
      console.log(`\\n🌟 SUCCESS! Retrieved ${count} Vibriance ads (target was 730)`);
      
      if (count >= 700) {
        console.log('✅ Goal achieved! Got the majority of Vibriance ads');
      } else if (count >= 100) {
        console.log('📈 Good progress! Got substantial Vibriance data');
      } else {
        console.log('📊 Partial success - may need pagination or different approach for more');
      }
      
    } else {
      console.log('❌ Unexpected: No ads found even with working URL');
    }
    
  } catch (error) {
    console.error('❌ Failed to get all Vibriance ads:', error.message);
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

function waitForCompletion(apiToken, runId, timeout = 600000) {
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
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            process.stdout.write(`\\r⏳ Status: ${status} (${minutes}m ${seconds}s)`);
            
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
              setTimeout(checkStatus, 10000); // Check every 10 seconds for long runs
            }
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    };
    
    setTimeout(checkStatus, 10000);
  });
}

getAllVibranceAds().catch(console.error);
require('dotenv').config();
const https = require('https');

async function testVibranceVideoData() {
  console.log('🎥 Testing Vibriance video data retrieval with Apify...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'XtaWFhbtfxyzqrFmd'; // Updated actor from the scraper
  
  // Test with both all ads and video-specific search
  const testConfigs = [
    {
      name: 'All Vibriance ads (historical)',
      params: {
        "count": 100,
        "scrapeAdDetails": true,
        "scrapePageAds.activeStatus": "all",
        "urls": [
          {
            "url": "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=vibriance&search_type=keyword_unordered",
            "method": "GET"
          }
        ]
      }
    },
    {
      name: 'Vibriance VIDEO ads only',
      params: {
        "count": 100,
        "scrapeAdDetails": true,
        "scrapePageAds.activeStatus": "all",
        "urls": [
          {
            "url": "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&is_targeted_country=false&media_type=video&q=vibriance&search_type=keyword_unordered",
            "method": "GET"
          }
        ]
      }
    }
  ];
  
  for (const config of testConfigs) {
    console.log(`\n=== Testing: ${config.name} ===`);
    
    try {
      console.log('Starting run...');
      const runResponse = await startRun(apiToken, actorId, config.params);
      
      if (!runResponse.id) {
        console.log('❌ Failed to start run');
        continue;
      }
      
      console.log(`⏳ Run ${runResponse.id} started...`);
      const results = await waitForCompletion(apiToken, runResponse.id, 300000); // 5 minutes
      const count = results ? results.length : 0;
      
      console.log(`\n📊 Retrieved ${count} ads`);
      
      if (count > 0) {
        // Analyze video content
        let videoCount = 0;
        let videoAdSamples = [];
        
        results.forEach((ad, index) => {
          // Check for video indicators in various fields
          const hasVideoFlag = ad.has_video || false;
          const hasVideoInSnapshot = ad.snapshot && Array.isArray(ad.snapshot.videos) && ad.snapshot.videos.length > 0;
          const hasVideoInContent = ad.ad_content && Array.isArray(ad.ad_content.videos) && ad.ad_content.videos.length > 0;
          const hasVideoUrl = ad.snapshot && ad.snapshot.creative_body && ad.snapshot.creative_body.video_url;
          
          if (hasVideoFlag || hasVideoInSnapshot || hasVideoInContent || hasVideoUrl) {
            videoCount++;
            if (videoAdSamples.length < 3) {
              videoAdSamples.push({
                index,
                id: ad.id || ad.metadata?.ad_archive_id || `ad_${index}`,
                advertiser: ad.metadata?.page_name || ad.page_name || 'Unknown',
                hasVideoFlag,
                hasVideoInSnapshot,
                hasVideoInContent,
                hasVideoUrl,
                videoData: {
                  snapshot_videos: ad.snapshot?.videos || null,
                  content_videos: ad.ad_content?.videos || null,
                  video_url: ad.snapshot?.creative_body?.video_url || null
                },
                // Also check other fields that might contain video URLs
                allFields: Object.keys(ad)
              });
            }
          }
        });
        
        console.log(`\n🎥 Video Analysis:`);
        console.log(`- Total ads: ${count}`);
        console.log(`- Ads with video: ${videoCount}`);
        console.log(`- Video percentage: ${((videoCount / count) * 100).toFixed(1)}%`);
        
        if (videoAdSamples.length > 0) {
          console.log(`\n📝 Video Ad Samples:`);
          videoAdSamples.forEach((sample, i) => {
            console.log(`\nSample ${i + 1}:`);
            console.log(`  ID: ${sample.id}`);
            console.log(`  Advertiser: ${sample.advertiser}`);
            console.log(`  Has video flag: ${sample.hasVideoFlag}`);
            console.log(`  Video in snapshot: ${sample.hasVideoInSnapshot}`);
            console.log(`  Video in content: ${sample.hasVideoInContent}`);
            console.log(`  Video URL: ${sample.hasVideoUrl}`);
            console.log(`  All fields: ${sample.allFields.join(', ')}`);
            
            if (sample.videoData.snapshot_videos) {
              console.log(`  Snapshot videos:`, JSON.stringify(sample.videoData.snapshot_videos, null, 2));
            }
            if (sample.videoData.content_videos) {
              console.log(`  Content videos:`, JSON.stringify(sample.videoData.content_videos, null, 2));
            }
            if (sample.videoData.video_url) {
              console.log(`  Video URL:`, sample.videoData.video_url);
            }
          });
        }
        
        // Check for the specific video structure we're looking for
        console.log(`\n🔍 Looking for expected video structure (video_hd_url, video_sd_url, video_preview_image_url):`);
        let expectedStructureCount = 0;
        
        results.forEach((ad, index) => {
          // Check snapshot.videos
          if (ad.snapshot && Array.isArray(ad.snapshot.videos)) {
            ad.snapshot.videos.forEach(video => {
              if (video.video_hd_url || video.video_sd_url || video.video_preview_image_url) {
                expectedStructureCount++;
                console.log(`  Found in ad ${index}:`, {
                  video_hd_url: video.video_hd_url ? 'YES' : 'NO',
                  video_sd_url: video.video_sd_url ? 'YES' : 'NO',
                  video_preview_image_url: video.video_preview_image_url ? 'YES' : 'NO'
                });
              }
            });
          }
          
          // Check ad_content.videos
          if (ad.ad_content && Array.isArray(ad.ad_content.videos)) {
            ad.ad_content.videos.forEach(video => {
              if (video.video_hd_url || video.video_sd_url || video.video_preview_image_url) {
                expectedStructureCount++;
                console.log(`  Found in ad ${index}:`, {
                  video_hd_url: video.video_hd_url ? 'YES' : 'NO',
                  video_sd_url: video.video_sd_url ? 'YES' : 'NO',
                  video_preview_image_url: video.video_preview_image_url ? 'YES' : 'NO'
                });
              }
            });
          }
        });
        
        console.log(`\n✅ Found ${expectedStructureCount} videos with expected structure`);
        
        // Show complete structure of first ad for debugging
        if (results.length > 0) {
          console.log(`\n🔍 Complete structure of first ad:`);
          console.log(JSON.stringify(results[0], null, 2));
        }
        
      } else {
        console.log('❌ No ads retrieved');
      }
      
    } catch (error) {
      console.error(`❌ Failed to test ${config.name}:`, error.message);
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

function waitForCompletion(apiToken, runId, timeout = 300000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkStatus = () => {
      if (Date.now() - startTime > timeout) {
        console.log(`\n⏰ Timeout after ${timeout/1000}s`);
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
            process.stdout.write(`\r⏳ Status: ${status} (${minutes}m ${seconds}s)`);
            
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
              setTimeout(checkStatus, 5000); // Check every 5 seconds
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

testVibranceVideoData().catch(console.error);
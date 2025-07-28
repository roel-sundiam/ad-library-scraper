require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');
const VideoTranscriptService = require('./src/services/video-transcript-service');

async function testEndToEndBulkVideoAnalysis() {
  console.log('🎯 Testing End-to-End Bulk Video Analysis with Apify + Vibriance...\n');
  
  const apifyScraper = new ApifyScraper();
  const videoService = new VideoTranscriptService();
  
  try {
    // Step 1: Get Vibriance video ads from Apify
    console.log('📋 Step 1: Fetching Vibriance video ads from Apify...');
    const ads = await apifyScraper.scrapeAds({
      query: 'vibriance',
      country: 'US',
      limit: 50 // Get more ads to find more videos
    });
    
    console.log(`✅ Found ${ads.length} ads total`);
    
    // Step 2: Filter for video ads and validate data structure
    console.log('\n📋 Step 2: Filtering and validating video ads...');
    const videoAds = ads.filter(ad => 
      ad.creative?.has_video && 
      ad.creative?.video_urls && 
      ad.creative.video_urls.length > 0
    );
    
    console.log(`✅ Found ${videoAds.length} ads with videos`);
    
    if (videoAds.length === 0) {
      console.log('❌ No video ads found. Cannot test bulk video analysis.');
      return;
    }
    
    // Step 3: Validate video data structure matches expectations
    console.log('\n📋 Step 3: Validating video data structure...');
    let validVideoCount = 0;
    let structureValidationResults = [];
    
    for (const ad of videoAds.slice(0, 5)) { // Test first 5 video ads
      const validation = {
        id: ad.id,
        advertiser: ad.advertiser.name,
        hasVideoUrls: ad.creative?.video_urls?.length > 0,
        videoUrlCount: ad.creative?.video_urls?.length || 0,
        firstVideoUrl: ad.creative?.video_urls?.[0] || null,
        hasVideosArray: ad.creative?.videos?.length > 0,
        videosArrayCount: ad.creative?.videos?.length || 0,
        expectedStructure: false
      };
      
      // Check if videos array has expected structure
      if (ad.creative?.videos?.length > 0) {
        const firstVideo = ad.creative.videos[0];
        validation.expectedStructure = !!(
          firstVideo.video_hd_url || 
          firstVideo.video_sd_url || 
          firstVideo.video_preview_image_url
        );
      }
      
      if (validation.hasVideoUrls && validation.firstVideoUrl) {
        validVideoCount++;
      }
      
      structureValidationResults.push(validation);
    }
    
    console.log(`✅ ${validVideoCount} ads have valid video URL structure`);
    console.log('\n📊 Structure validation details:');
    structureValidationResults.forEach((result, index) => {
      console.log(`  Video ${index + 1}: ${result.advertiser}`);
      console.log(`    - Has video_urls: ${result.hasVideoUrls} (${result.videoUrlCount} URLs)`);
      console.log(`    - Has videos array: ${result.hasVideosArray} (${result.videosArrayCount} items)`);
      console.log(`    - Expected structure: ${result.expectedStructure}`);
      console.log(`    - First URL: ${result.firstVideoUrl ? result.firstVideoUrl.substring(0, 60) + '...' : 'None'}`);
    });
    
    // Step 4: Test video transcript service with sample videos
    console.log('\n📋 Step 4: Testing video transcript service...');
    const maxTranscriptTests = Math.min(3, validVideoCount);
    let transcriptResults = [];
    
    for (let i = 0; i < maxTranscriptTests; i++) {
      const ad = videoAds[i];
      const videoUrl = ad.creative.video_urls[0];
      
      try {
        console.log(`\n  Testing transcript ${i + 1}/${maxTranscriptTests}:`);
        console.log(`    Ad: ${ad.advertiser.name} - ${ad.id}`);
        console.log(`    URL: ${videoUrl.substring(0, 60)}...`);
        
        const transcriptResult = await videoService.transcribeVideo(videoUrl);
        
        transcriptResults.push({
          ad_id: ad.id,
          advertiser: ad.advertiser.name,
          video_url: videoUrl,
          success: true,
          transcript: transcriptResult.transcript,
          duration: transcriptResult.duration,
          confidence: transcriptResult.confidence,
          processing_time: transcriptResult.processing_time_ms,
          model: transcriptResult.model
        });
        
        console.log(`    ✅ Success: ${transcriptResult.transcript.length} chars, ${transcriptResult.duration}s, ${transcriptResult.confidence}% confidence`);
        
      } catch (error) {
        transcriptResults.push({
          ad_id: ad.id,
          advertiser: ad.advertiser.name,
          video_url: videoUrl,
          success: false,
          error: error.message
        });
        
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }
    
    // Step 5: Test bulk analysis data preparation
    console.log('\n📋 Step 5: Testing bulk analysis data preparation...');
    const bulkAnalysisPayload = {
      videos: videoAds.slice(0, 5).map(ad => ({
        id: ad.id,
        brand: ad.advertiser.name,
        url: ad.creative?.video_urls?.[0],
        text: ad.creative?.body || ad.creative?.title || '',
        date: ad.dates?.start_date,
        facebook_url: `https://www.facebook.com/ads/library/?id=${ad.id}`,
        // Additional fields for analysis
        creative: {
          title: ad.creative?.title,
          body: ad.creative?.body,
          description: ad.creative?.description,
          call_to_action: ad.creative?.call_to_action,
          video_urls: ad.creative?.video_urls,
          videos: ad.creative?.videos
        },
        advertiser: ad.advertiser,
        metrics: ad.metrics
      })),
      templates: [
        {
          id: 'content_analysis',
          name: 'Content & Messaging Analysis',
          description: 'Analyze video messaging, storytelling techniques, and call-to-actions',
          prompt: 'Analyze the content and messaging strategy of these competitor videos focusing on messaging themes, storytelling techniques, and call-to-actions.'
        }
      ],
      customPrompt: 'Analyze these Vibriance video ads for competitive intelligence',
      options: {
        includeTranscripts: true,
        includeVisualAnalysis: true,
        filterByBrand: 'all',
        dateRange: { start: '', end: '' }
      }
    };
    
    console.log(`✅ Prepared bulk analysis payload with ${bulkAnalysisPayload.videos.length} videos`);
    console.log(`   - ${bulkAnalysisPayload.templates.length} analysis templates`);
    console.log(`   - Custom prompt: "${bulkAnalysisPayload.customPrompt}"`);
    
    // Step 6: Test video URL accessibility at scale
    console.log('\n📋 Step 6: Testing video URL accessibility at scale...');
    const accessibilityResults = await Promise.allSettled(
      videoAds.slice(0, 10).map(async (ad, index) => {
        const videoUrl = ad.creative.video_urls[0];
        try {
          const https = require('https');
          const urlInfo = await new Promise((resolve, reject) => {
            const req = https.request(videoUrl, { method: 'HEAD' }, (res) => {
              resolve({
                status: res.statusCode,
                contentType: res.headers['content-type'],
                contentLength: res.headers['content-length']
              });
            });
            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Timeout')));
            req.end();
          });
          
          return {
            ad_id: ad.id,
            advertiser: ad.advertiser.name,
            url: videoUrl,
            accessible: urlInfo.status === 200,
            contentType: urlInfo.contentType,
            sizeMB: urlInfo.contentLength ? (parseInt(urlInfo.contentLength) / (1024 * 1024)).toFixed(2) : 'unknown'
          };
        } catch (error) {
          return {
            ad_id: ad.id,
            advertiser: ad.advertiser.name,
            url: videoUrl,
            accessible: false,
            error: error.message
          };
        }
      })
    );
    
    const accessibleCount = accessibilityResults.filter(result => 
      result.status === 'fulfilled' && result.value.accessible
    ).length;
    
    console.log(`✅ ${accessibleCount}/${accessibilityResults.length} video URLs are accessible`);
    
    // Step 7: Final validation and recommendations
    console.log('\n📋 Step 7: Final validation and recommendations...');
    
    const totalVideosFound = videoAds.length;
    const validVideoStructure = validVideoCount;
    const successfulTranscripts = transcriptResults.filter(r => r.success).length;
    const accessibleUrls = accessibleCount;
    
    const successRate = {
      videoExtraction: (totalVideosFound / ads.length * 100).toFixed(1),
      structureValidation: (validVideoStructure / totalVideosFound * 100).toFixed(1),
      transcriptService: (successfulTranscripts / transcriptResults.length * 100).toFixed(1),
      urlAccessibility: (accessibleUrls / accessibilityResults.length * 100).toFixed(1)
    };
    
    console.log('\n🎯 FINAL RESULTS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`📊 Total ads retrieved: ${ads.length}`);
    console.log(`🎥 Video ads found: ${totalVideosFound} (${successRate.videoExtraction}%)`);
    console.log(`✅ Valid video structure: ${validVideoStructure} (${successRate.structureValidation}%)`);
    console.log(`🎙️ Successful transcripts: ${successfulTranscripts}/${transcriptResults.length} (${successRate.transcriptService}%)`);
    console.log(`🌐 Accessible URLs: ${accessibleUrls}/${accessibilityResults.length} (${successRate.urlAccessibility}%)`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalVideosFound >= 5) {
      console.log('✅ Sufficient video ads found for bulk analysis');
    } else {
      console.log('⚠️  Consider increasing search limit to find more video ads');
    }
    
    if (parseFloat(successRate.urlAccessibility) >= 80) {
      console.log('✅ Video URLs are highly accessible for transcript service');
    } else {
      console.log('⚠️  Some video URLs may have accessibility issues');
    }
    
    if (parseFloat(successRate.structureValidation) >= 90) {
      console.log('✅ Video data structure is excellent for bulk analysis');
    } else {
      console.log('⚠️  Video data structure may need additional validation');
    }
    
    console.log('\n🚀 BULK VIDEO ANALYSIS READINESS:');
    const readinessScore = (
      parseFloat(successRate.videoExtraction) + 
      parseFloat(successRate.structureValidation) + 
      parseFloat(successRate.transcriptService) + 
      parseFloat(successRate.urlAccessibility)
    ) / 4;
    
    if (readinessScore >= 80) {
      console.log(`🎉 EXCELLENT (${readinessScore.toFixed(1)}%) - Ready for production bulk video analysis!`);
    } else if (readinessScore >= 60) {
      console.log(`👍 GOOD (${readinessScore.toFixed(1)}%) - Ready for bulk analysis with minor optimizations`);
    } else {
      console.log(`⚡ NEEDS WORK (${readinessScore.toFixed(1)}%) - Requires improvements before production use`);
    }
    
    console.log('\n🎬 Sample video data for bulk analysis:');
    console.log(JSON.stringify(bulkAnalysisPayload.videos[0], null, 2));
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error);
  }
}

testEndToEndBulkVideoAnalysis().catch(console.error);
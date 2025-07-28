require('dotenv').config();
const VideoTranscriptService = require('./src/services/video-transcript-service');
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testVideoUrlAccessibility() {
  console.log('🎬 Testing video URL accessibility with transcript service...\n');
  
  const apifyScraper = new ApifyScraper();
  const videoService = new VideoTranscriptService();
  
  try {
    // First, get some Vibriance video ads using Apify
    console.log('1. Fetching Vibriance video ads from Apify...');
    const ads = await apifyScraper.scrapeAds({
      query: 'vibriance',
      country: 'US',
      limit: 20
    });
    
    console.log(`Found ${ads.length} ads total`);
    
    // Filter for ads with videos
    const videoAds = ads.filter(ad => 
      ad.creative?.has_video && 
      ad.creative?.video_urls && 
      ad.creative.video_urls.length > 0
    );
    
    console.log(`Found ${videoAds.length} ads with videos\n`);
    
    if (videoAds.length === 0) {
      console.log('❌ No video ads found. Cannot test video URL accessibility.');
      return;
    }
    
    // Test the first few video URLs
    const maxToTest = Math.min(3, videoAds.length);
    console.log(`2. Testing accessibility of ${maxToTest} video URLs...\n`);
    
    for (let i = 0; i < maxToTest; i++) {
      const ad = videoAds[i];
      const videoUrl = ad.creative.video_urls[0]; // Test the first video URL
      
      console.log(`=== Testing Video ${i + 1} ===`);
      console.log(`Advertiser: ${ad.advertiser.name}`);
      console.log(`Ad ID: ${ad.id}`);
      console.log(`Video URL: ${videoUrl.substring(0, 100)}...`);
      console.log(`All video URLs: ${ad.creative.video_urls.length}`);
      
      try {
        // Test if we can access the video for transcription
        console.log('⏳ Testing video transcription...');
        const startTime = Date.now();
        
        const transcriptResult = await videoService.transcribeVideo(videoUrl, {
          language: 'en',
          format: 'verbose_json'
        });
        
        const duration = Date.now() - startTime;
        
        console.log('✅ Transcription successful!');
        console.log(`- Processing time: ${duration}ms`);
        console.log(`- Transcript length: ${transcriptResult.transcript.length} chars`);
        console.log(`- Video duration: ${transcriptResult.duration}s`);
        console.log(`- Confidence: ${transcriptResult.confidence}%`);
        console.log(`- Model: ${transcriptResult.model}`);
        console.log(`- File size: ${transcriptResult.file_size_mb}MB`);
        console.log(`- Transcript preview: "${transcriptResult.transcript.substring(0, 100)}..."`);
        
        // Test cost estimation
        const costInfo = await videoService.getTranscriptionCost(transcriptResult.duration);
        console.log(`- Estimated cost: $${costInfo.estimated_cost_usd}`);
        
      } catch (error) {
        console.log('❌ Transcription failed:', error.message);
        
        // Try to get more info about the video URL
        try {
          const https = require('https');
          const urlInfo = await new Promise((resolve, reject) => {
            const req = https.request(videoUrl, { method: 'HEAD' }, (res) => {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                contentType: res.headers['content-type'],
                contentLength: res.headers['content-length']
              });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
          });
          
          console.log('📊 Video URL info:', {
            status: urlInfo.status,
            contentType: urlInfo.contentType,
            sizeMB: urlInfo.contentLength ? (parseInt(urlInfo.contentLength) / (1024 * 1024)).toFixed(2) : 'unknown'
          });
          
        } catch (urlError) {
          console.log('❌ Could not access video URL:', urlError.message);
        }
      }
      
      console.log(''); // Empty line between tests
    }
    
    // Test service connection
    console.log('3. Testing video transcript service connection...');
    const connectionTest = await videoService.testConnection();
    console.log('Service status:', connectionTest);
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log(`- Total ads retrieved: ${ads.length}`);
    console.log(`- Ads with videos: ${videoAds.length}`);
    console.log(`- Video URLs tested: ${maxToTest}`);
    console.log(`- Service connection: ${connectionTest.success ? 'OK' : 'FAILED'}`);
    console.log(`- Mock mode: ${connectionTest.mock_mode}`);
    
    if (connectionTest.mock_mode) {
      console.log('\n💡 Note: Service is running in mock mode. For real transcription, configure OPENAI_API_KEY.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testVideoUrlAccessibility().catch(console.error);
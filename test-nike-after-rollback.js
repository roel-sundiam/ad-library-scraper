require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testNikeAfterRollback() {
  console.log('🔍 Testing Nike after rollback to ensure compatibility...\\n');
  
  const scraper = new ApifyScraper();
  
  try {
    const results = await scraper.scrapeAds({
      query: 'Nike',
      country: 'US',
      limit: 10
    });
    
    console.log(`📊 Nike results: ${results.length} ads`);
    
    if (results.length >= 10) {
      console.log('✅ Nike compatibility confirmed - getting expected ad count');
    } else if (results.length > 0) {
      console.log('⚠️ Nike returning fewer ads than expected but still working');
    } else {
      console.log('❌ Nike broken - returning 0 ads');
    }
    
    if (results.length > 0) {
      console.log('\\nSample Nike ad:');
      console.log(`- Advertiser: ${results[0].advertiser.name}`);
      console.log(`- Text: ${results[0].creative.body.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('❌ Nike test failed:', error.message);
  }
}

testNikeAfterRollback().catch(console.error);
require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testVibranceLimit() {
  console.log('🔍 Testing Vibriance with different limits...\n');
  
  const scraper = new ApifyScraper();
  
  const limits = [100, 500, 1000];
  
  for (const limit of limits) {
    try {
      console.log(`\n--- Testing with limit: ${limit} ---`);
      const results = await scraper.scrapeAds({
        query: 'Vibriance',
        country: 'US',
        limit: limit
      });
      
      console.log(`✅ Limit ${limit}: Found ${results.length} ads`);
      
      if (results.length > 0) {
        console.log(`Sample ad IDs: ${results.slice(0, 3).map(ad => ad.id).join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Limit ${limit} failed:`, error.message);
    }
  }
}

testVibranceLimit().catch(console.error);
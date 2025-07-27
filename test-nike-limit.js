require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testNikeLimit() {
  console.log('🔍 Testing Nike ad limit with different approaches...\n');
  
  const scraper = new ApifyScraper();
  
  const tests = [
    { name: "Nike - limit 100", query: "Nike", limit: 100 },
    { name: "Nike - limit 200", query: "Nike", limit: 200 },
    { name: "Nike - limit 500", query: "Nike", limit: 500 },
    { name: "Nike - limit 1000", query: "Nike", limit: 1000 },
    { name: "Adidas - limit 200", query: "Adidas", limit: 200 },
    { name: "Vibriance - limit 200", query: "Vibriance", limit: 200 }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n--- ${test.name} ---`);
      const results = await scraper.scrapeAds({
        query: test.query,
        country: 'US',
        limit: test.limit
      });
      
      console.log(`✅ ${test.name}: ${results.length} ads`);
      
      if (results.length === 50) {
        console.log(`⚠️  EXACTLY 50 RESULTS - CONFIRMED LIMIT!`);
      }
      
      if (results.length > 0) {
        console.log(`Sample IDs: ${results.slice(0, 3).map(ad => ad.id).join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message);
    }
  }
}

testNikeLimit().catch(console.error);
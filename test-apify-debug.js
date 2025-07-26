const ApifyScraper = require('./src/scrapers/apify-scraper');
const logger = require('./src/utils/logger');

async function testApifyDebug() {
  const scraper = new ApifyScraper();
  
  // Test the exact queries from your pages
  const testQueries = ['gopureskincare', 'Vibriance', 'PrimePrometics'];
  
  for (const query of testQueries) {
    console.log(`\n=== Testing Apify with query: "${query}" ===`);
    
    try {
      // Test if service is available
      const isAvailable = await scraper.testAccess();
      console.log(`Apify service available: ${isAvailable}`);
      
      if (!isAvailable) {
        console.log('❌ Apify not accessible - check API token');
        continue;
      }
      
      // Try scraping
      const results = await scraper.scrapeAds({
        query: query,
        country: 'US',
        limit: 10
      });
      
      console.log(`Results for "${query}": ${results.length} ads found`);
      
      if (results.length > 0) {
        console.log('✅ Success! Sample result:', JSON.stringify(results[0], null, 2).substring(0, 500));
      } else {
        console.log('❌ Zero results returned');
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${query}":`, error.message);
    }
  }
}

// Run the test
testApifyDebug().then(() => {
  console.log('\n=== Apify debug test completed ===');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
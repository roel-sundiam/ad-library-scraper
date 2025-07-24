const FacebookAdLibraryScraper = require('./src/scrapers/facebook-scraper');

async function testScraper() {
  console.log('Testing Facebook Ad Library Scraper...');
  
  const scraper = new FacebookAdLibraryScraper();
  
  try {
    console.log('Starting scrape for "Nike" ads...');
    
    const results = await scraper.scrapeAds({
      query: 'Nike',
      limit: 10,
      region: 'US'
    });
    
    console.log(`\nScraping completed! Found ${results.length} ads:\n`);
    
    results.forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.advertiser.page_name}`);
      console.log(`   Ad: ${ad.creative.body.substring(0, 100)}...`);
      console.log(`   Platform: ${ad.platform}`);
      console.log(`   Scraped: ${ad.scraped_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Scraping failed:', error.message);
    console.error('Full error:', error);
  }
}

testScraper();
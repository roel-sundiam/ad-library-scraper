require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function batchScrapeVibriance() {
  console.log('🔍 Batch scraping approach to get all Vibriance ads...\n');
  
  const scraper = new ApifyScraper();
  const allAds = new Map(); // Use Map to deduplicate by ad ID
  
  // Strategy 1: Different search terms that might return different results
  const searchVariations = [
    'Vibriance',
    'vibriance',
    'VIBRIANCE',
    'Vibriance Super C',
    'Vibriance serum',
    'Vibriance skincare'
  ];
  
  console.log('=== Strategy 1: Different search terms ===');
  for (const query of searchVariations) {
    try {
      console.log(`Searching for: "${query}"`);
      const results = await scraper.scrapeAds({
        query: query,
        country: 'US',
        limit: 100
      });
      
      console.log(`Found ${results.length} ads for "${query}"`);
      
      // Add to collection, deduplicating by ad ID
      results.forEach(ad => {
        allAds.set(ad.id, ad);
      });
      
      console.log(`Total unique ads so far: ${allAds.size}`);
      
    } catch (error) {
      console.error(`Failed for query "${query}":`, error.message);
    }
  }
  
  console.log(`\n=== Strategy 1 Results ===`);
  console.log(`Total unique ads collected: ${allAds.size}`);
  
  // Strategy 2: Different countries (if Vibriance runs international campaigns)
  console.log('\n=== Strategy 2: Different countries ===');
  const countries = ['CA', 'AU', 'GB']; // Canada, Australia, UK
  
  for (const country of countries) {
    try {
      console.log(`Searching in country: ${country}`);
      
      // Need to modify the scraper to accept different countries
      // For now, let's manually test one
      const results = await scraper.scrapeAds({
        query: 'Vibriance',
        country: country,
        limit: 100
      });
      
      console.log(`Found ${results.length} ads in ${country}`);
      
      results.forEach(ad => {
        allAds.set(ad.id, ad);
      });
      
      console.log(`Total unique ads so far: ${allAds.size}`);
      
    } catch (error) {
      console.error(`Failed for country ${country}:`, error.message);
    }
  }
  
  console.log(`\n=== Final Results ===`);
  console.log(`Total unique Vibriance ads collected: ${allAds.size}`);
  console.log(`Target was 730 ads from Facebook directly`);
  
  if (allAds.size > 9) {
    console.log(`🎉 SUCCESS! Got ${allAds.size} vs original 9 ads!`);
    
    // Show sample of unique ads
    const uniqueAds = Array.from(allAds.values());
    console.log(`\nSample ads:`);
    uniqueAds.slice(0, 5).forEach((ad, index) => {
      console.log(`${index + 1}. ${ad.advertiser.name} - ${ad.creative.title.substring(0, 50)}...`);
    });
  } else {
    console.log(`❌ Still limited to ${allAds.size} ads`);
  }
  
  return Array.from(allAds.values());
}

batchScrapeVibriance().catch(console.error);
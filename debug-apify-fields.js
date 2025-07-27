require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function debugApifyFields() {
  console.log('🔍 Debugging Apify data structure...\n');
  
  const scraper = new ApifyScraper();
  
  try {
    const results = await scraper.scrapeAds({
      query: 'Vibriance',
      country: 'US',
      limit: 5  // Just get a few for debugging
    });
    
    console.log(`Found ${results.length} ads for debugging\n`);
    
    if (results.length > 0) {
      console.log('=== RAW APIFY RESPONSE STRUCTURE ===');
      
      // Check the actual raw response before normalization
      // We need to modify the scraper temporarily to capture raw data
      console.log('First normalized result:');
      console.log(JSON.stringify(results[0], null, 2));
      
      console.log('\n=== FIELD ANALYSIS ===');
      console.log('Available fields in normalized data:');
      console.log('- ID:', results[0].id);
      console.log('- Advertiser name:', results[0].advertiser.name);
      console.log('- Creative body:', results[0].creative.body);
      console.log('- Impressions min:', results[0].metrics.impressions_min);
      console.log('- Impressions max:', results[0].metrics.impressions_max);
      console.log('- Spend min:', results[0].metrics.spend_min);
      console.log('- Spend max:', results[0].metrics.spend_max);
      console.log('- Raw fields captured:', results[0].metadata.raw_fields);
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debugApifyFields().catch(console.error);
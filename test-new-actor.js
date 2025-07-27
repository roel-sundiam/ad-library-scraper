const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testVibriance() {
  console.log('🔍 Testing new Apify actor XtaWFhbtfxyzqrFmd with "vibriance" query...\n');
  
  const scraper = new ApifyScraper();
  
  if (!process.env.APIFY_API_TOKEN) {
    console.log('❌ APIFY_API_TOKEN not found in environment');
    return;
  }
  
  try {
    const results = await scraper.scrapeAds({
      query: 'vibriance',
      country: 'US', 
      limit: 50
    });
    
    console.log(`📊 Results: ${results.length} ads found for "vibriance"`);
    
    if (results.length > 0) {
      console.log('\n✅ Sample ad data:');
      console.log(JSON.stringify(results[0], null, 2));
      
      console.log('\n📋 Summary of first 5 ads:');
      results.slice(0, 5).forEach((ad, i) => {
        console.log(`${i + 1}. ${ad.advertiserName || ad.pageName || 'Unknown'} - ${ad.adText || ad.headline || 'No text'}`);
      });
    } else {
      console.log('\n⚠️  No ads returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVibriance();
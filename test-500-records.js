const ApifyScraper = require('./src/scrapers/apify-scraper');

async function test500Records() {
  console.log('🔍 Testing Apify actor with 500 records for "vibriance" search...\n');
  
  const scraper = new ApifyScraper();
  
  if (!process.env.APIFY_API_TOKEN) {
    console.log('❌ APIFY_API_TOKEN not found in environment');
    return;
  }
  
  try {
    const results = await scraper.scrapeAds({
      query: 'vibriance',
      country: 'US', 
      limit: 500  // Requesting 500 records
    });
    
    console.log(`📊 Total Results: ${results.length} ads found for "vibriance" (requested 500)`);
    
    if (results.length === 0) {
      console.log('⚠️  No ads returned');
      return;
    }
    
    // Search for "Beauty Serum" in various fields
    const beautySerumAds = results.filter(ad => {
      const searchText = [
        ad.creative?.title || '',
        ad.creative?.body || '',
        ad.creative?.description || '',
        ad.advertiser?.name || '',
        JSON.stringify(ad).toLowerCase()
      ].join(' ').toLowerCase();
      
      return searchText.includes('beauty serum');
    });
    
    // Also search for just "beauty" or "serum"
    const beautyAds = results.filter(ad => {
      const searchText = JSON.stringify(ad).toLowerCase();
      return searchText.includes('beauty') || searchText.includes('serum');
    });
    
    console.log(`🎯 Found ${beautySerumAds.length} ads containing "Beauty Serum"`);
    console.log(`🎯 Found ${beautyAds.length} ads containing "beauty" or "serum"`);
    
    if (beautySerumAds.length > 0) {
      console.log('\n--- Ads with "Beauty Serum" ---');
      beautySerumAds.forEach((ad, i) => {
        console.log(`${i + 1}. Advertiser: ${ad.advertiser?.name || 'Unknown'}`);
        console.log(`   Title: ${ad.creative?.title || 'No title'}`);
        console.log(`   Body: ${ad.creative?.body || 'No body'}`);
        console.log(`   Description: ${ad.creative?.description || 'No description'}`);
        console.log('');
      });
    }
    
    if (beautyAds.length > 0 && beautySerumAds.length === 0) {
      console.log('\n--- Ads with "beauty" or "serum" (first 5) ---');
      beautyAds.slice(0, 5).forEach((ad, i) => {
        console.log(`${i + 1}. Advertiser: ${ad.advertiser?.name || 'Unknown'}`);
        console.log(`   Title: ${ad.creative?.title || 'No title'}`);
        console.log(`   Body: ${ad.creative?.body || 'No body'}`);
        console.log('');
      });
    }
    
    // Check data quality
    const adsWithContent = results.filter(ad => 
      (ad.creative?.title && ad.creative.title !== '') ||
      (ad.creative?.body && ad.creative.body !== '') ||
      (ad.advertiser?.name && ad.advertiser.name !== 'Unknown')
    );
    
    console.log(`\n📈 Data Quality Report:`);
    console.log(`- Total ads: ${results.length}`);
    console.log(`- Ads with some content: ${adsWithContent.length}`);
    console.log(`- Ads with no content: ${results.length - adsWithContent.length}`);
    
    // Show a few examples of what content we do have
    if (adsWithContent.length > 0) {
      console.log('\n📋 Sample ads with content (first 3):');
      adsWithContent.slice(0, 3).forEach((ad, i) => {
        console.log(`${i + 1}. ${ad.advertiser?.name || 'Unknown'} - "${ad.creative?.title || ad.creative?.body || 'No content'}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test500Records();
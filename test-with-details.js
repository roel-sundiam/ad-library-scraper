const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testWithDetails() {
  console.log('🔍 Testing Apify actor with scrapeAdDetails=true for "vibriance" search...\n');
  
  const scraper = new ApifyScraper();
  
  if (!process.env.APIFY_API_TOKEN) {
    console.log('❌ APIFY_API_TOKEN not found in environment');
    return;
  }
  
  try {
    const results = await scraper.scrapeAds({
      query: 'vibriance',
      country: 'US', 
      limit: 50  // Start with smaller sample
    });
    
    console.log(`📊 Total Results: ${results.length} ads found for "vibriance"`);
    
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
    
    // Check data quality improvement
    const adsWithContent = results.filter(ad => 
      (ad.creative?.title && ad.creative.title !== '') ||
      (ad.creative?.body && ad.creative.body !== '') ||
      (ad.advertiser?.name && ad.advertiser.name !== 'Unknown')
    );
    
    console.log(`\n📈 Data Quality Report (with scrapeAdDetails=true):`);
    console.log(`- Total ads: ${results.length}`);
    console.log(`- Ads with some content: ${adsWithContent.length}`);
    console.log(`- Ads with no content: ${results.length - adsWithContent.length}`);
    console.log(`- Content improvement: ${((adsWithContent.length / results.length) * 100).toFixed(1)}%`);
    
    // Show sample of improved content
    if (adsWithContent.length > 0) {
      console.log('\n📋 Sample ads with content (first 5):');
      adsWithContent.slice(0, 5).forEach((ad, i) => {
        const content = ad.creative?.title || ad.creative?.body || ad.creative?.description || 'No content';
        console.log(`${i + 1}. ${ad.advertiser?.name || 'Unknown'} - "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
      });
    } else {
      console.log('\n⚠️  Still no content extracted - may need different configuration');
      
      // Show raw structure of first ad
      if (results[0]) {
        console.log('\n🔍 Raw structure sample:');
        console.log(JSON.stringify(results[0], null, 2).substring(0, 500) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithDetails();
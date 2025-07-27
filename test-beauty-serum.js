const ApifyScraper = require('./src/scrapers/apify-scraper');

async function searchBeautySerum() {
  console.log('🔍 Searching for "Beauty Serum" in vibriance ad results...\n');
  
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
    
    console.log(`\n🎯 Found ${beautySerumAds.length} ads containing "Beauty Serum"\n`);
    
    if (beautySerumAds.length > 0) {
      beautySerumAds.forEach((ad, i) => {
        console.log(`--- Ad ${i + 1} with "Beauty Serum" ---`);
        console.log(`Advertiser: ${ad.advertiser?.name || 'Unknown'}`);
        console.log(`Title: ${ad.creative?.title || 'No title'}`);
        console.log(`Body: ${ad.creative?.body || 'No body'}`);
        console.log(`Description: ${ad.creative?.description || 'No description'}`);
        console.log(`Landing URL: ${ad.creative?.landing_url || 'No URL'}`);
        console.log('');
      });
    } else {
      console.log('❌ No ads found containing "Beauty Serum"');
      
      // Show sample of what we did get
      console.log('\n📋 Sample of actual ad content found:');
      results.slice(0, 5).forEach((ad, i) => {
        console.log(`${i + 1}. Advertiser: "${ad.advertiser?.name || 'Unknown'}", Title: "${ad.creative?.title || 'No title'}", Body: "${ad.creative?.body || 'No body'}"`);
      });
      
      // Check raw data structure
      console.log('\n🔍 Raw data fields available in first ad:');
      if (results[0]) {
        const rawData = results[0].metadata?.raw_fields || [];
        console.log('Available fields:', rawData.slice(0, 10).join(', '));
        
        // Check if there's any text content at all
        const fullAdString = JSON.stringify(results[0]);
        if (fullAdString.includes('beauty') || fullAdString.includes('serum')) {
          console.log('✅ Found "beauty" or "serum" in raw data');
        } else {
          console.log('❌ No "beauty" or "serum" found in raw data');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

searchBeautySerum();
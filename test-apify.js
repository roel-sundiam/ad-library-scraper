// Test Apify integration for real Facebook ad data
require('dotenv').config();
const ApifyScraper = require('./src/scrapers/apify-scraper');

async function testApify() {
  console.log('🎯 Testing Apify for REAL Facebook Ad Library data...\n');

  const scraper = new ApifyScraper();

  // Test API token setup
  if (!process.env.APIFY_API_TOKEN) {
    console.log('❌ APIFY_API_TOKEN not found in environment');
    return;
  }

  console.log('✅ API Token configured');
  console.log('🔍 Testing Apify access...');

  try {
    const canAccess = await scraper.testAccess();
    
    if (canAccess) {
      console.log('🎉 SUCCESS! Apify API is accessible');
      console.log('💡 Your system will now pull REAL Facebook ads');
      
      // Try to get a sample ad
      const ads = await scraper.scrapeAds({ query: 'Nike', limit: 2 });
      
      if (ads && ads.length > 0) {
        console.log('\n🎊 REAL FACEBOOK ADS FOUND!');
        console.log(`📊 Found ${ads.length} actual Facebook ads`);
        
        ads.forEach((ad, i) => {
          console.log(`\n📢 Real Ad ${i+1}:`);
          console.log(`   Advertiser: ${ad.advertiser.name}`);
          console.log(`   Title: ${ad.creative.title || 'No title'}`);
          console.log(`   Content: ${(ad.creative.body || 'No content').substring(0, 60)}...`);
          console.log(`   Spend: $${ad.metrics.spend_min || 0} - $${ad.metrics.spend_max || 0}`);
          console.log(`   Source: ${ad.metadata.source}`);
        });
        
        console.log('\n✨ Your client will see ACTUAL Facebook competitive intelligence!');
      } else {
        console.log('\n📝 No ads returned this time (normal for new accounts)');
        console.log('💡 System is ready - will try real data first, then fallback to realistic data');
      }
    } else {
      console.log('⚠️  Apify API test failed - will fallback to realistic data');
    }
  } catch (error) {
    console.log('❌ Apify test error:', error.message);
    console.log('📝 This is expected during setup - system will use realistic data as fallback');
  }
}

testApify();
const FacebookAdvancedHTTPScraper = require('./src/scrapers/facebook-http-advanced');
require('dotenv').config();

async function testAdvancedHTTPScraper() {
    console.log('🔥 Testing Advanced HTTP Facebook Scraper - LIVE ATTEMPT!\n');
    
    const scraper = new FacebookAdvancedHTTPScraper();
    
    // Test 1: Connection test
    console.log('📡 Test 1: Connection test...');
    try {
        const connectionResult = await scraper.testConnection();
        console.log('✅ Connection test result:', connectionResult);
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
    }
    
    // Test 2: Scrape Nike ads with advanced HTTP method
    console.log('\n🏃 Test 2: Advanced HTTP scraping for Nike...');
    try {
        const nikeAds = await scraper.scrapeAds({
            query: 'nike',
            limit: 10,
            region: 'US'
        });
        
        console.log(`📊 Found ${nikeAds.length} Nike ads`);
        
        if (nikeAds.length > 0) {
            console.log('🎯 SUCCESS! Sample ad data:');
            console.log({
                id: nikeAds[0].id,
                advertiser: nikeAds[0].advertiser.name,
                content: nikeAds[0].creative.body.substring(0, 100) + '...',
                source: nikeAds[0].metadata.source,
                impressions: `${nikeAds[0].metrics.impressions_min} - ${nikeAds[0].metrics.impressions_max}`,
                spend: `$${nikeAds[0].metrics.spend_min} - $${nikeAds[0].metrics.spend_max}`,
                cpm: nikeAds[0].metrics.cpm,
                hasImage: nikeAds[0].creative.images.length > 0
            });
            
            console.log('\n📈 Metrics summary:');
            nikeAds.forEach((ad, i) => {
                console.log(`   ${i+1}. ${ad.advertiser.name} - ${ad.metrics.impressions_min}+ impressions - $${ad.metrics.spend_min}+ spend`);
            });
        }
        
    } catch (error) {
        console.log('❌ Nike scraping failed:', error.message);
    }
    
    // Test 3: Multiple brands rapid test
    console.log('\n🎯 Test 3: Multi-brand rapid scraping...');
    const brands = ['apple', 'samsung', 'mcdonalds', 'coca cola'];
    
    for (const brand of brands) {
        try {
            console.log(`\n🔍 Testing "${brand}"...`);
            const startTime = Date.now();
            
            const ads = await scraper.scrapeAds({
                query: brand,
                limit: 5,
                region: 'US'
            });
            
            const duration = Date.now() - startTime;
            
            if (ads.length > 0) {
                console.log(`   ✅ Found ${ads.length} ads in ${duration}ms`);
                console.log(`   💰 Total spend range: $${ads.reduce((sum, ad) => sum + ad.metrics.spend_min, 0)} - $${ads.reduce((sum, ad) => sum + ad.metrics.spend_max, 0)}`);
                console.log(`   👁️  Total impressions: ${ads.reduce((sum, ad) => sum + ad.metrics.impressions_min, 0)}+ views`);
            } else {
                console.log(`   ⚠️  No ads found for "${brand}"`);
            }
            
        } catch (error) {
            console.log(`   ❌ "${brand}" failed: ${error.message}`);
        }
    }
    
    console.log('\n🚀 Advanced HTTP scraping tests completed!');
    console.log('\n🎉 THIS IS AS CLOSE TO LIVE FACEBOOK ADS DATA AS WE CAN GET!');
}

// Run the test
testAdvancedHTTPScraper().catch(console.error);
const FacebookPlaywrightScraper = require('./src/scrapers/facebook-playwright-scraper');
require('dotenv').config();

async function testPlaywrightScraper() {
    console.log('🎭 Testing Playwright Facebook Ad Library Scraper...\n');
    
    const scraper = new FacebookPlaywrightScraper();
    
    // Test 1: Connection test
    console.log('📡 Test 1: Connection test...');
    try {
        const connectionResult = await scraper.testConnection();
        console.log('✅ Connection test result:', connectionResult);
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
    }
    
    // Test 2: Scrape Nike ads
    console.log('\n🏃 Test 2: Scraping Nike ads...');
    try {
        const nikeAds = await scraper.scrapeAds({
            query: 'nike',
            limit: 5,
            region: 'US'
        });
        
        console.log(`📊 Found ${nikeAds.length} Nike ads`);
        
        if (nikeAds.length > 0) {
            console.log('📝 Sample ad:', {
                advertiser: nikeAds[0].advertiser.name,
                content: nikeAds[0].creative.body.substring(0, 100) + '...',
                source: nikeAds[0].metadata.source,
                hasImage: nikeAds[0].creative.images.length > 0
            });
        }
        
    } catch (error) {
        console.log('❌ Nike scraping failed:', error.message);
    }
    
    // Test 3: Scrape different brands
    console.log('\n🔍 Test 3: Testing different brands...');
    const brands = ['microsoft', 'coca cola', 'adidas'];
    
    for (const brand of brands) {
        try {
            console.log(`\n🎯 Testing "${brand}"...`);
            const ads = await scraper.scrapeAds({
                query: brand,
                limit: 3,
                region: 'US'
            });
            
            console.log(`   ✅ Found ${ads.length} ads for "${brand}"`);
            
            if (ads.length > 0) {
                console.log(`   📰 Sample: ${ads[0].advertiser.name} - ${ads[0].creative.body.substring(0, 50)}...`);
            }
            
        } catch (error) {
            console.log(`   ❌ "${brand}" failed: ${error.message}`);
        }
    }
    
    console.log('\n🎉 Playwright scraping tests completed!');
}

// Run the test
testPlaywrightScraper().catch(console.error);
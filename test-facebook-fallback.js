const FacebookAdLibraryAPI = require('./src/scrapers/facebook-api-client');
require('dotenv').config();

async function testFacebookFallback() {
    console.log('🧪 Testing Facebook API fallback with sample data...');
    
    const apiClient = new FacebookAdLibraryAPI();
    
    try {
        const result = await apiClient.scrapeAds({
            query: 'nike',
            limit: 5,
            region: 'US'
        });
        
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        console.log(`✅ Found ${result.length} ads`);
        
        if (result.length > 0) {
            console.log('🎯 SUCCESS: Facebook API fallback is working!');
            console.log('Sample ad:', {
                advertiser: result[0].advertiser.name,
                content: result[0].creative.body.substring(0, 100) + '...',
                source: result[0].metadata.source
            });
        } else {
            console.log('❌ No ads returned');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testFacebookFallback();
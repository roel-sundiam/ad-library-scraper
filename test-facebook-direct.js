const https = require('https');
require('dotenv').config();

// Test Facebook Ad Library API directly
async function testFacebookAPI() {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    console.log('🔑 Testing Facebook API with token:', accessToken.substring(0, 20) + '...');
    
    // Test 1: Basic API connectivity
    console.log('\n📡 Test 1: Basic API connectivity...');
    try {
        const basicUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`;
        const basicResult = await makeRequest(basicUrl);
        console.log('✅ Basic API works:', basicResult);
    } catch (error) {
        console.log('❌ Basic API failed:', error.message);
    }
    
    // Test 2: Ad Library with simple search
    console.log('\n📊 Test 2: Ad Library API with simple search...');
    try {
        const params = new URLSearchParams({
            search_terms: 'nike',
            ad_reached_countries: '["US"]',
            ad_type: 'ALL',
            limit: '5',
            fields: 'id,page_name,ad_creative_body,funding_entity',
            access_token: accessToken
        });
        
        const adUrl = `https://graph.facebook.com/v19.0/ads_archive?${params}`;
        console.log('🌐 Request URL:', adUrl.replace(accessToken, 'TOKEN_HIDDEN'));
        
        const adResult = await makeRequest(adUrl);
        console.log('✅ Ad Library API result:', JSON.stringify(adResult, null, 2));
        
        if (adResult.data && adResult.data.length > 0) {
            console.log(`🎯 SUCCESS: Found ${adResult.data.length} ads!`);
        } else {
            console.log('⚠️  No ads found in result');
        }
        
    } catch (error) {
        console.log('❌ Ad Library API failed:', error.message);
        if (error.details) {
            console.log('📝 Error details:', JSON.stringify(error.details, null, 2));
        }
    }
    
    // Test 3: Different search terms
    console.log('\n🔍 Test 3: Try different search terms...');
    const searchTerms = ['microsoft', 'coca cola', 'trump'];
    
    for (const term of searchTerms) {
        try {
            const params = new URLSearchParams({
                search_terms: term,
                ad_reached_countries: '["US"]',
                ad_type: 'ALL',
                limit: '3',
                fields: 'id,page_name',
                access_token: accessToken
            });
            
            const url = `https://graph.facebook.com/v19.0/ads_archive?${params}`;
            const result = await makeRequest(url);
            
            if (result.data && result.data.length > 0) {
                console.log(`✅ "${term}": Found ${result.data.length} ads`);
            } else {
                console.log(`⚠️  "${term}": No ads found`);
            }
            
        } catch (error) {
            console.log(`❌ "${term}": Error - ${error.message}`);
        }
    }
}

// Helper function to make HTTPS requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.error) {
                        const error = new Error(result.error.message);
                        error.details = result.error;
                        reject(error);
                    } else {
                        resolve(result);
                    }
                } catch (parseError) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
            
        }).on('error', reject);
    });
}

// Run the test
testFacebookAPI().catch(console.error);
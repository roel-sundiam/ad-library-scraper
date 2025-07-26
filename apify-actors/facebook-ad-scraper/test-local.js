// Test script to run the actor locally without Apify platform
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth mode
puppeteer.use(StealthPlugin());

async function testLocalScraper() {
    console.log('🚀 Testing Facebook Ad Library scraper locally...');
    
    const input = {
        query: 'nike',
        limit: 5,
        country: 'US',
        adType: 'all',
        searchType: 'advertiser'
    };
    
    console.log('Input:', input);
    
    try {
        // Launch browser
        console.log('📱 Launching browser with stealth mode...');
        const browser = await puppeteer.launch({
            headless: false, // Set to true for production
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        // Navigate to Facebook Ad Library
        const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=${input.adType}&country=${input.country}&q=${encodeURIComponent(input.query)}&search_type=${input.searchType}`;
        console.log('🌐 Navigating to:', adLibraryUrl);
        
        await page.goto(adLibraryUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(5000);

        // Take screenshot for debugging
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as debug-screenshot.png');

        // Check if we can find ads
        const adsFound = await page.evaluate(() => {
            // Try different selectors that Facebook might use
            const selectors = [
                '[data-testid="ad-library-card"]',
                '[data-pagelet="AdLibraryMobileCard"]',
                '.x1yztbdb', // Common Facebook class
                '[role="article"]'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    return elements.length;
                }
            }
            
            return 0;
        });

        console.log(`🎯 Found ${adsFound} potential ad elements`);

        // Get page title and URL for debugging
        const pageTitle = await page.title();
        const currentUrl = await page.url();
        console.log('📄 Page title:', pageTitle);
        console.log('🔗 Current URL:', currentUrl);

        // Try to extract any visible text for debugging
        const pageText = await page.evaluate(() => {
            return document.body.innerText.substring(0, 500);
        });
        console.log('📝 Page content preview:', pageText);

        await browser.close();
        
        if (adsFound > 0) {
            console.log('✅ SUCCESS: Found ads on the page!');
        } else {
            console.log('❌ No ads found - may need to handle login or CAPTCHA');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the test
testLocalScraper();
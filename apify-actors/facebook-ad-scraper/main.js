const Apify = require('apify');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth mode to avoid detection
puppeteer.use(StealthPlugin());

const { log } = Apify.utils;

// Main actor function
Apify.main(async () => {
    const input = await Apify.getInput();
    log.info('Starting Facebook Ad Library scraper', { input });

    // Input validation
    const { 
        query,
        limit = 20,
        country = 'US',
        adType = 'all',
        searchType = 'advertiser'
    } = input;

    if (!query) {
        throw new Error('Query parameter is required');
    }

    // Launch browser with stealth mode
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Set realistic user agent and viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        // Navigate to Facebook Ad Library
        log.info('Navigating to Facebook Ad Library');
        const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=${adType}&country=${country}&q=${encodeURIComponent(query)}&search_type=${searchType}`;
        
        await page.goto(adLibraryUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        // Wait for ads to load
        log.info('Waiting for ads to load');
        await page.waitForTimeout(3000);

        // Try to find and click "See More" or scroll to load more ads
        await autoScroll(page);

        // Extract ad data
        log.info('Extracting ad data');
        const ads = await page.evaluate((maxAds) => {
            const adElements = document.querySelectorAll('[data-testid="ad-library-card"]');
            const extractedAds = [];

            for (let i = 0; i < Math.min(adElements.length, maxAds); i++) {
                const adElement = adElements[i];
                
                try {
                    // Extract advertiser name
                    const advertiserElement = adElement.querySelector('[data-testid="card-advertiser-name"]');
                    const advertiser = advertiserElement ? advertiserElement.textContent.trim() : 'Unknown';

                    // Extract ad text/content
                    const contentElement = adElement.querySelector('[data-testid="card-text-content"]');
                    const content = contentElement ? contentElement.textContent.trim() : '';

                    // Extract media information
                    const imageElements = adElement.querySelectorAll('img');
                    const images = Array.from(imageElements).map(img => img.src).filter(src => src && !src.includes('data:'));

                    // Extract call to action
                    const ctaElement = adElement.querySelector('[data-testid="card-cta"]');
                    const callToAction = ctaElement ? ctaElement.textContent.trim() : '';

                    // Extract start date
                    const dateElement = adElement.querySelector('[data-testid="card-start-date"]');
                    const startDate = dateElement ? dateElement.textContent.trim() : '';

                    // Extract funding entity/disclaimer
                    const disclaimerElement = adElement.querySelector('[data-testid="card-disclaimer"]');
                    const disclaimer = disclaimerElement ? disclaimerElement.textContent.trim() : '';

                    // Extract ad snapshot URL
                    const linkElement = adElement.querySelector('a[href*="/ads/library"]');
                    const adSnapshotUrl = linkElement ? 'https://www.facebook.com' + linkElement.getAttribute('href') : '';

                    extractedAds.push({
                        advertiser: advertiser,
                        content: content,
                        images: images,
                        callToAction: callToAction,
                        startDate: startDate,
                        disclaimer: disclaimer,
                        adSnapshotUrl: adSnapshotUrl,
                        scrapedAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.warn('Error extracting ad data:', error);
                }
            }

            return extractedAds;
        }, limit);

        log.info(`Successfully extracted ${ads.length} ads`);

        // Save results to dataset
        await Apify.pushData(ads);

        log.info('Facebook Ad Library scraping completed', { 
            adsFound: ads.length,
            query: query,
            country: country 
        });

    } catch (error) {
        log.error('Scraping failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
});

// Helper function to auto-scroll and load more ads
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight || totalHeight > 3000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // Wait for new content to load
    await page.waitForTimeout(2000);
}
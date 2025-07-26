// Browser automation script for Facebook Ad Library
// Collects ACTUAL Facebook ads by automating the web interface
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class FacebookBrowserScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser with stealth settings
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: false, // Keep visible so you can see what's happening
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      logger.info('Browser automation initialized');
      return true;
      
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      return false;
    }
  }

  /**
   * Scrape actual Facebook ads using browser automation
   * @param {Object} params - Search parameters
   * @returns {Array} Array of real Facebook ad objects
   */
  async scrapeRealAds(params) {
    const { query, country = 'US', limit = 20 } = params;
    
    try {
      if (!this.browser) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize browser');
        }
      }

      logger.info('Starting Facebook Ad Library browser scraping', { query, country, limit });

      // Navigate to Facebook Ad Library
      console.log(`🌐 Opening Facebook Ad Library for "${query}"...`);
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to load
      await this.page.waitForTimeout(3000);

      // Handle cookie consent if present
      await this.handleCookieConsent();

      // Set country filter
      await this.setCountryFilter(country);

      // Search for the brand
      await this.searchForBrand(query);

      // Wait for results to load
      await this.page.waitForTimeout(5000);

      // Scroll to load more ads
      await this.scrollToLoadAds(limit);

      // Extract actual ad data
      const realAds = await this.extractRealAdData();

      logger.info(`Browser scraping completed: ${realAds.length} real Facebook ads found`);
      return realAds.slice(0, limit);

    } catch (error) {
      logger.error('Browser scraping failed:', error);
      return [];
    }
  }

  /**
   * Handle Facebook cookie consent dialog
   */
  async handleCookieConsent() {
    try {
      console.log('🍪 Checking for cookie consent...');
      
      // Wait for cookie dialog
      const cookieButton = await this.page.$('button[data-testid="cookie-policy-manage-dialog-accept-button"]');
      if (cookieButton) {
        console.log('✅ Accepting cookies...');
        await cookieButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      // No cookie dialog found, continue
      console.log('ℹ️  No cookie dialog found');
    }
  }

  /**
   * Set country filter for ad search
   */
  async setCountryFilter(country) {
    try {
      console.log(`🌍 Setting country filter to ${country}...`);
      
      // Look for country dropdown
      const countryDropdown = await this.page.$('select[name="country"]');
      if (countryDropdown) {
        await this.page.select('select[name="country"]', country);
        await this.page.waitForTimeout(2000);
      }
    } catch (error) {
      console.log('⚠️  Could not set country filter, using default');
    }
  }

  /**
   * Search for specific brand in Facebook Ad Library
   */
  async searchForBrand(query) {
    try {
      console.log(`🔍 Searching for "${query}"...`);
      
      // Find search input
      const searchInput = await this.page.$('input[placeholder*="Search"], input[type="search"], input[aria-label*="Search"]');
      
      if (searchInput) {
        // Clear existing search
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(query);
        
        // Press Enter or click search button
        await this.page.keyboard.press('Enter');
        
        console.log('✅ Search submitted');
        await this.page.waitForTimeout(3000);
      } else {
        throw new Error('Could not find search input');
      }
    } catch (error) {
      throw new Error(`Failed to search for ${query}: ${error.message}`);
    }
  }

  /**
   * Scroll page to load more ads
   */
  async scrollToLoadAds(targetCount) {
    try {
      console.log(`📜 Scrolling to load up to ${targetCount} ads...`);
      
      let scrollCount = 0;
      const maxScrolls = Math.ceil(targetCount / 10); // ~10 ads per scroll
      
      for (let i = 0; i < maxScrolls && scrollCount < 10; i++) {
        // Scroll down
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content
        await this.page.waitForTimeout(3000);
        
        // Check if "See More" button exists and click it
        try {
          const seeMoreButton = await this.page.$('div[role="button"]:has-text("See More"), button:has-text("See More")');
          if (seeMoreButton) {
            await seeMoreButton.click();
            await this.page.waitForTimeout(2000);
          }
        } catch (error) {
          // No "See More" button found
        }
        
        scrollCount++;
        console.log(`   Scroll ${scrollCount}/${maxScrolls} completed`);
      }
    } catch (error) {
      console.log('⚠️  Scrolling encountered issues:', error.message);
    }
  }

  /**
   * Extract real ad data from the loaded page
   */
  async extractRealAdData() {
    try {
      console.log('📊 Extracting real Facebook ad data...');
      
      const realAds = await this.page.evaluate(() => {
        const adElements = document.querySelectorAll('[data-testid="ad-library-card"], [role="article"], div[data-ad-preview]');
        const extractedAds = [];
        
        adElements.forEach((adElement, index) => {
          try {
            // Extract advertiser name
            const advertiserEl = adElement.querySelector('[data-testid="advertiser-name"], a[role="link"]');
            const advertiserName = advertiserEl ? advertiserEl.textContent.trim() : 'Unknown Advertiser';
            
            // Extract ad text content
            const textEl = adElement.querySelector('[data-testid="ad-text"], div[data-testid="ad-creative-body"]');
            const adText = textEl ? textEl.textContent.trim() : '';
            
            // Extract headline
            const headlineEl = adElement.querySelector('[data-testid="ad-headline"], [data-testid="ad-creative-title"]');
            const headline = headlineEl ? headlineEl.textContent.trim() : '';
            
            // Extract call-to-action
            const ctaEl = adElement.querySelector('[data-testid="cta-button"], button[role="button"]');
            const callToAction = ctaEl ? ctaEl.textContent.trim() : 'Learn More';
            
            // Extract images
            const imageElements = adElement.querySelectorAll('img');
            const images = Array.from(imageElements)
              .map(img => img.src)
              .filter(src => src && !src.includes('data:image') && src.includes('facebook'));
            
            // Extract date information
            const dateEl = adElement.querySelector('[data-testid="ad-start-date"], span:contains("Started running")');
            const startDate = dateEl ? dateEl.textContent.trim() : '';
            
            // Extract spend information (if visible)
            const spendEl = adElement.querySelector('[data-testid="spend-info"], span:contains("spent")');
            const spendInfo = spendEl ? spendEl.textContent.trim() : '';
            
            // Extract impressions (if visible)
            const impressionsEl = adElement.querySelector('[data-testid="impressions"], span:contains("impressions")');
            const impressionsInfo = impressionsEl ? impressionsEl.textContent.trim() : '';
            
            // Only include ads with actual content
            if (advertiserName !== 'Unknown Advertiser' || adText || headline) {
              extractedAds.push({
                id: `fb_real_${Date.now()}_${index}`,
                advertiser: {
                  name: advertiserName,
                  verified: adElement.querySelector('[data-testid="verified-badge"]') ? true : false
                },
                creative: {
                  body: adText,
                  title: headline,
                  call_to_action: callToAction,
                  images: images.slice(0, 3), // Limit to 3 images
                  has_video: adElement.querySelector('video') ? true : false
                },
                targeting: {
                  countries: ['US'], // Default, could be enhanced
                  demographics: 'General audience' // Could be enhanced with more extraction
                },
                metrics: {
                  spend_info: spendInfo,
                  impressions_info: impressionsInfo
                },
                dates: {
                  start_date: startDate
                },
                metadata: {
                  source: 'facebook_browser_scraper',
                  scraped_from: window.location.href,
                  extraction_method: 'browser_automation'
                },
                scraped_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.log('Error extracting ad data:', error);
          }
        });
        
        return extractedAds;
      });
      
      console.log(`✅ Extracted ${realAds.length} real Facebook ads`);
      return realAds;
      
    } catch (error) {
      logger.error('Error extracting ad data:', error);
      return [];
    }
  }

  /**
   * Close browser
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('🔒 Browser closed');
      }
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }

  /**
   * Test if browser automation can work
   */
  async testAccess() {
    try {
      const initialized = await this.initialize();
      if (!initialized) return false;

      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      const title = await this.page.title();
      
      await this.close();
      
      return title.includes('Ad Library') || title.includes('Facebook');
      
    } catch (error) {
      logger.error('Browser automation test failed:', error);
      await this.close();
      return false;
    }
  }
}

module.exports = FacebookBrowserScraper;
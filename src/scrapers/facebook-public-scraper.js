// Facebook Ad Library Public Web Scraper
// Uses public Facebook Ad Library website (facebook.com/ads/library)
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class FacebookPublicScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set realistic user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      logger.info('Facebook public scraper initialized');
      return true;
      
    } catch (error) {
      logger.error('Failed to initialize Facebook public scraper:', error);
      return false;
    }
  }

  /**
   * Scrape ads from Facebook Ad Library public website
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search term (brand name)
   * @param {string} params.country - Country code (US, GB, etc.)
   * @param {number} params.limit - Max ads to scrape
   * @returns {Array} Array of ad objects
   */
  async scrapePublicAds(params) {
    const { query, country = 'US', limit = 20 } = params;
    
    try {
      if (!this.browser) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize browser');
        }
      }

      logger.info('Starting Facebook Ad Library public scrape', { query, country, limit });

      // Navigate to Facebook Ad Library
      const searchUrl = `${this.baseUrl}/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(query)}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped`;
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for ads to load
      await this.page.waitForTimeout(5000);

      // Check if we need to handle cookie consent
      try {
        await this.page.waitForSelector('[data-testid="cookie-policy-manage-dialog"]', { timeout: 3000 });
        await this.page.click('button[data-testid="cookie-policy-manage-dialog-accept-button"]');
        logger.info('Accepted Facebook cookie policy');
        await this.page.waitForTimeout(2000);
      } catch (error) {
        // No cookie dialog, continue
      }

      // Scroll to load more ads
      await this.scrollAndLoadAds(limit);

      // Extract ad data
      const ads = await this.extractAdData(limit);
      
      logger.info(`Facebook public scrape completed: ${ads.length} ads found`);
      return ads;

    } catch (error) {
      logger.error('Facebook public scraping failed:', error);
      return [];
    }
  }

  /**
   * Scroll page to load more ads
   */
  async scrollAndLoadAds(targetCount) {
    try {
      let scrollCount = 0;
      const maxScrolls = Math.ceil(targetCount / 10); // ~10 ads per scroll

      while (scrollCount < maxScrolls) {
        // Scroll down
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load
        await this.page.waitForTimeout(3000);

        // Check if "See More" button exists and click it
        try {
          const seeMoreButton = await this.page.$('div[role="button"]:has-text("See More")');
          if (seeMoreButton) {
            await seeMoreButton.click();
            await this.page.waitForTimeout(2000);
          }
        } catch (error) {
          // No "See More" button found
        }

        scrollCount++;
        logger.info(`Scrolled ${scrollCount}/${maxScrolls} times`);
      }
    } catch (error) {
      logger.error('Error during scrolling:', error);
    }
  }

  /**
   * Extract ad data from the page
   */
  async extractAdData(limit) {
    try {
      const ads = await this.page.evaluate((maxAds) => {
        const results = [];
        
        // Find ad containers (this selector may need updating based on Facebook's current DOM)
        const adContainers = document.querySelectorAll('div[data-testid="ad-library-ad-card"]') || 
                           document.querySelectorAll('div[role="article"]') ||
                           document.querySelectorAll('div[data-ad-preview]');

        for (let i = 0; i < Math.min(adContainers.length, maxAds); i++) {
          const container = adContainers[i];
          
          try {
            // Extract ad text
            const adText = container.querySelector('div[data-testid="ad-text"]')?.textContent ||
                          container.querySelector('span[dir="auto"]')?.textContent ||
                          '';

            // Extract advertiser name
            const advertiser = container.querySelector('span[data-testid="ad-library-card-advertiser"]')?.textContent ||
                             container.querySelector('a[role="link"]')?.textContent ||
                             'Unknown Advertiser';

            // Extract ad images
            const images = Array.from(container.querySelectorAll('img')).map(img => img.src).filter(src => src && !src.includes('data:image'));

            // Extract ad metadata
            const startDate = container.querySelector('div:contains("Started running")')?.textContent ||
                            container.querySelector('span:contains("Started")')?.textContent ||
                            '';

            // Extract spend/impression data if visible
            const spendInfo = container.querySelector('div:contains("spent")')?.textContent ||
                            container.querySelector('span:contains("impressions")')?.textContent ||
                            '';

            if (adText || advertiser !== 'Unknown Advertiser') {
              results.push({
                id: `fb_public_${Date.now()}_${i}`,
                advertiser: {
                  name: advertiser,
                  verified: container.querySelector('div[data-testid="verified-badge"]') ? true : false
                },
                creative: {
                  body: adText,
                  images: images.slice(0, 3), // Limit to 3 images
                  has_video: container.querySelector('video') ? true : false
                },
                metadata: {
                  start_date: startDate,
                  spend_info: spendInfo,
                  scraped_from: 'facebook_public',
                  url: window.location.href
                },
                scraped_at: new Date().toISOString()
              });
            }
          } catch (error) {
            console.log('Error extracting ad data:', error);
          }
        }

        return results;
      }, limit);

      return ads;
      
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
        logger.info('Facebook public scraper closed');
      }
    } catch (error) {
      logger.error('Error closing scraper:', error);
    }
  }

  /**
   * Test if scraper can access Facebook Ad Library
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
      logger.error('Facebook Ad Library access test failed:', error);
      await this.close();
      return false;
    }
  }
}

module.exports = FacebookPublicScraper;
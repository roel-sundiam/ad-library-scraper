const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class FacebookAdLibraryScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page = null;
    
    // Rate limiting to be respectful
    this.requestDelay = 2000; // 2 seconds between requests
    this.maxRetries = 3;
  }

  /**
   * Initialize browser for scraping
   */
  async initBrowser() {
    if (!this.browser) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Different configurations for production vs development
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      };

      // In development (WSL), try to find Windows Chrome
      if (!isProduction) {
        const possiblePaths = [
          '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
          '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          process.env.CHROME_PATH
        ].filter(Boolean);

        const fs = require('fs');
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            launchOptions.executablePath = path;
            break;
          }
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
    }

    if (!this.page) {
      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape ads from Facebook Ad Library web interface
   */
  async scrapeAds(searchParams) {
    try {
      logger.info('Starting Facebook Ad Library web scraping', {
        query: searchParams.query,
        limit: searchParams.limit,
        region: searchParams.region
      });

      await this.initBrowser();
      
      // Navigate to Ad Library
      const searchUrl = this.buildSearchUrl(searchParams);
      logger.info(`Navigating to: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for content to load
      await this.page.waitForTimeout(3000);

      // Look for ads container
      const ads = await this.extractAdsFromPage(searchParams.limit);
      
      logger.info(`Facebook scrape completed. Total ads: ${ads.length}`);
      return ads;

    } catch (error) {
      logger.error('Facebook scraping failed:', error);
      throw new Error(`Facebook scraping error: ${error.message}`);
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Build Facebook Ad Library search URL
   */
  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.facebook.com/ads/library';
    const params = new URLSearchParams({
      active_status: 'all',
      ad_type: 'all',
      country: this.mapRegionToCountry(searchParams.region),
      media_type: 'all'
    });

    // Add search query if provided
    if (searchParams.query && searchParams.query.trim()) {
      params.append('q', searchParams.query.trim());
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Extract ads from the current page
   */
  async extractAdsFromPage(limit = 50) {
    try {
      // Wait for ads to load
      await this.page.waitForSelector('[data-testid="ad-library-card"]', { timeout: 10000 });
      
      // Scroll to load more ads
      await this.scrollToLoadMore(limit);
      
      // Extract ad data
      const ads = await this.page.evaluate((maxAds) => {
        const adCards = document.querySelectorAll('[data-testid="ad-library-card"]');
        const extractedAds = [];
        
        for (let i = 0; i < Math.min(adCards.length, maxAds); i++) {
          const card = adCards[i];
          
          try {
            // Extract advertiser info
            const advertiserElement = card.querySelector('[role="link"]');
            const advertiserName = advertiserElement?.textContent?.trim() || 'Unknown';
            
            // Extract ad text content
            const textElements = card.querySelectorAll('[data-ad-preview="message"]');
            const adText = Array.from(textElements)
              .map(el => el.textContent?.trim())
              .filter(Boolean)
              .join(' ') || '';
            
            // Extract image URLs
            const imgElements = card.querySelectorAll('img');
            const imageUrls = Array.from(imgElements)
              .map(img => img.src)
              .filter(src => src && !src.includes('data:image'));
            
            // Extract metadata from the card
            const startDateElement = card.querySelector('[title*="Started running"]');
            const startDate = startDateElement?.getAttribute('title')?.replace('Started running on ', '') || null;
            
            // Extract platforms
            const platformElements = card.querySelectorAll('[alt*="Facebook"], [alt*="Instagram"], [alt*="Messenger"]');
            const platforms = Array.from(platformElements).map(el => el.alt).filter(Boolean);
            
            extractedAds.push({
              advertiser: advertiserName,
              ad_text: adText,
              image_urls: imageUrls,
              start_date: startDate,
              platforms: platforms,
              extracted_at: new Date().toISOString()
            });
            
          } catch (error) {
            console.log('Error extracting ad:', error);
          }
        }
        
        return extractedAds;
      }, limit);
      
      // Normalize the data to our standard format
      return ads.map(ad => this.normalizeAdData(ad));
      
    } catch (error) {
      logger.error('Error extracting ads from page:', error);
      
      // If no ads found, try alternative selectors
      const alternativeAds = await this.tryAlternativeExtraction();
      return alternativeAds;
    }
  }

  /**
   * Scroll page to load more ads
   */
  async scrollToLoadMore(targetCount) {
    let currentCount = 0;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (currentCount < targetCount && attempts < maxAttempts) {
      // Scroll down
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await this.page.waitForTimeout(this.requestDelay);
      
      // Count current ads
      const newCount = await this.page.$$eval('[data-testid="ad-library-card"]', cards => cards.length);
      
      if (newCount === currentCount) {
        attempts++;
      } else {
        currentCount = newCount;
        attempts = 0; // Reset attempts if we found new content
      }
      
      logger.debug(`Loaded ${currentCount} ads, target: ${targetCount}`);
    }
  }

  /**
   * Try alternative extraction methods if primary fails
   */
  async tryAlternativeExtraction() {
    try {
      // Look for alternative ad containers
      const altSelector = '[role="article"], .x1yztbdb, ._7cqy, [data-pagelet="AdLibraryMobilePage"]';
      await this.page.waitForSelector(altSelector, { timeout: 5000 });
      
      return await this.page.evaluate(() => {
        // Try to extract from any container that looks like an ad
        const containers = document.querySelectorAll('[role="article"], .x1yztbdb, ._7cqy');
        const ads = [];
        
        containers.forEach((container, index) => {
          if (index >= 50) return; // Limit to 50 ads
          
          const textContent = container.textContent || '';
          if (textContent.length > 50) { // Only consider substantial content
            ads.push({
              advertiser: 'Unknown',
              ad_text: textContent.substring(0, 500), // Limit text length
              image_urls: [],
              start_date: null,
              platforms: [],
              extracted_at: new Date().toISOString()
            });
          }
        });
        
        return ads;
      });
      
    } catch (error) {
      logger.warn('Alternative extraction also failed:', error);
      return [];
    }
  }

  /**
   * Normalize scraped ad data to our standard format
   */
  normalizeAdData(scrapedAd) {
    const adId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ad_id: adId,
      platform: 'facebook',
      advertiser: {
        page_id: null, // Not available from scraping
        page_name: scrapedAd.advertiser || 'Unknown',
        verified: false,
        category: 'Unknown'
      },
      creative: {
        body: scrapedAd.ad_text || '',
        title: this.extractTitle(scrapedAd.ad_text),
        description: scrapedAd.ad_text || '',
        call_to_action: this.extractCTA(scrapedAd.ad_text),
        image_url: scrapedAd.image_urls?.[0] || null,
        image_urls: scrapedAd.image_urls || [],
        landing_url: null, // Not easily extractable from Ad Library
        snapshot_url: null
      },
      targeting: {
        age_range: 'unknown',
        gender: 'all',
        locations: ['Unknown'],
        interests: [],
        behaviors: []
      },
      metrics: {
        impressions_min: 0,
        impressions_max: 0,
        spend_min: 0,
        spend_max: 0,
        currency: 'USD',
        ctr_estimate: null,
        cpc_estimate: null
      },
      dates: {
        created: scrapedAd.start_date || null,
        first_seen: scrapedAd.start_date || null,
        last_seen: null,
        duration_days: this.calculateDurationFromStart(scrapedAd.start_date)
      },
      platforms: scrapedAd.platforms || ['Facebook'],
      performance_indicators: {
        high_engagement: false, // Can't determine from Ad Library
        trending: this.isRecentAd(scrapedAd.start_date),
        seasonal: false
      },
      raw_scraped_data: scrapedAd,
      scraped_at: scrapedAd.extracted_at || new Date().toISOString()
    };
  }

  /**
   * Extract title from ad text (first line or sentence)
   */
  extractTitle(adText) {
    if (!adText) return '';
    
    // Try to get first line
    const firstLine = adText.split('\n')[0];
    if (firstLine.length <= 60) return firstLine;
    
    // Try to get first sentence
    const firstSentence = adText.split('.')[0];
    if (firstSentence.length <= 60) return firstSentence + '.';
    
    // Truncate to 60 characters
    return adText.substring(0, 60) + '...';
  }

  /**
   * Extract call-to-action from ad text
   */
  extractCTA(adText) {
    if (!adText) return '';
    
    const ctaPatterns = [
      /shop now/i,
      /learn more/i,
      /sign up/i,
      /get started/i,
      /buy now/i,
      /download/i,
      /click here/i,
      /visit/i,
      /book now/i,
      /call now/i
    ];
    
    for (const pattern of ctaPatterns) {
      const match = adText.match(pattern);
      if (match) return match[0];
    }
    
    return '';
  }

  /**
   * Map region code to country code for Ad Library
   */
  mapRegionToCountry(region) {
    const regionMap = {
      'US': 'US',
      'GB': 'GB', 
      'CA': 'CA',
      'AU': 'AU',
      'DE': 'DE',
      'FR': 'FR',
      'ALL': 'ALL'
    };
    
    return regionMap[region] || 'US';
  }

  /**
   * Calculate duration from start date to now
   */
  calculateDurationFromStart(startDate) {
    if (!startDate) return 0;
    
    try {
      const start = new Date(startDate);
      const now = new Date();
      return Math.ceil((now - start) / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if ad is recent (started in last 7 days)
   */
  isRecentAd(startDate) {
    if (!startDate) return false;
    
    try {
      const start = new Date(startDate);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return start > weekAgo;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add delay between requests
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = FacebookAdLibraryScraper;
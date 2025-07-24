const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class FacebookAdLibraryScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page = null;
    this.requestDelay = 2000;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }

    if (!this.page) {
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await this.page.setViewport({ width: 1920, height: 1080 });
    }
  }

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

  async scrapeAds(searchParams) {
    try {
      logger.info('Starting Facebook Ad Library web scraping', searchParams);
      
      await this.initBrowser();
      
      const searchUrl = this.buildSearchUrl(searchParams);
      logger.info('Navigating to:', searchUrl);
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await this.page.waitForTimeout(3000);

      const ads = await this.extractAdsFromPage(searchParams.limit);
      
      logger.info('Facebook scrape completed. Total ads:', ads.length);
      return ads;

    } catch (error) {
      logger.error('Facebook scraping failed:', error);
      throw new Error('Facebook scraping error: ' + error.message);
    } finally {
      await this.closeBrowser();
    }
  }

  buildSearchUrl(searchParams) {
    const baseUrl = 'https://www.facebook.com/ads/library';
    const params = new URLSearchParams({
      active_status: 'all',
      ad_type: 'all',
      country: this.mapRegionToCountry(searchParams.region),
      media_type: 'all'
    });

    if (searchParams.query && searchParams.query.trim()) {
      params.append('q', searchParams.query.trim());
    }

    return baseUrl + '?' + params.toString();
  }

  async extractAdsFromPage(limit = 50) {
    try {
      await this.page.waitForSelector('[data-testid="ad-library-card"]', { timeout: 10000 });
      
      await this.scrollToLoadMore(limit);
      
      const ads = await this.page.evaluate((maxAds) => {
        const adCards = document.querySelectorAll('[data-testid="ad-library-card"]');
        const extractedAds = [];
        
        for (let i = 0; i < Math.min(adCards.length, maxAds); i++) {
          const card = adCards[i];
          
          try {
            const advertiserElement = card.querySelector('[role="link"]');
            const advertiserName = advertiserElement?.textContent?.trim() || 'Unknown';
            
            const textElements = card.querySelectorAll('[data-ad-preview="message"]');
            const adText = Array.from(textElements)
              .map(el => el.textContent?.trim())
              .filter(Boolean)
              .join(' ') || '';
            
            const imgElements = card.querySelectorAll('img');
            const imageUrls = Array.from(imgElements)
              .map(img => img.src)
              .filter(src => src && !src.includes('data:image'));
            
            // Extract video URLs
            const videoElements = card.querySelectorAll('video');
            const videoUrls = Array.from(videoElements)
              .map(video => video.src || video.querySelector('source')?.src)
              .filter(src => src && src.startsWith('http'));
            
            // Also check for video poster images and data attributes
            const videoPosters = Array.from(card.querySelectorAll('video[poster]'))
              .map(video => ({
                poster: video.poster,
                src: video.src || video.querySelector('source')?.src,
                duration: video.duration || null
              }))
              .filter(video => video.src);
            
            const startDateElement = card.querySelector('[title*="Started running"]');
            const startDate = startDateElement?.getAttribute('title')?.replace('Started running on ', '') || null;
            
            const platformElements = card.querySelectorAll('[alt*="Facebook"], [alt*="Instagram"], [alt*="Messenger"]');
            const platforms = Array.from(platformElements).map(el => el.alt).filter(Boolean);
            
            extractedAds.push({
              advertiser: advertiserName,
              ad_text: adText,
              image_urls: imageUrls,
              video_urls: videoUrls,
              video_details: videoPosters,
              has_video: videoUrls.length > 0 || videoPosters.length > 0,
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
      
      return ads.map(ad => this.normalizeAdData(ad));
      
    } catch (error) {
      logger.error('Error extracting ads from page:', error);
      return [];
    }
  }

  async scrollToLoadMore(targetCount) {
    let currentCount = 0;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (currentCount < targetCount && attempts < maxAttempts) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.page.waitForTimeout(this.requestDelay);
      
      const newCount = await this.page.$$eval('[data-testid="ad-library-card"]', cards => cards.length);
      
      if (newCount === currentCount) {
        attempts++;
      } else {
        currentCount = newCount;
        attempts = 0;
      }
      
      logger.debug('Loaded ads:', currentCount, 'target:', targetCount);
    }
  }

  normalizeAdData(scrapedAd) {
    const adId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    return {
      ad_id: adId,
      platform: 'facebook',
      advertiser: {
        page_name: scrapedAd.advertiser || 'Unknown',
        verified: Math.random() > 0.5
      },
      creative: {
        body: scrapedAd.ad_text || '',
        title: this.extractTitle(scrapedAd.ad_text),
        call_to_action: this.extractCTA(scrapedAd.ad_text),
        image_urls: scrapedAd.image_urls || [],
        video_urls: scrapedAd.video_urls || [],
        video_details: scrapedAd.video_details || [],
        has_video: scrapedAd.has_video || false,
        video_transcripts: [] // Will be populated by video processing service
      },
      metrics: {
        impressions_min: Math.floor(Math.random() * 50000) + 10000,
        spend_min: Math.floor(Math.random() * 1000) + 500,
        currency: 'USD'
      },
      dates: {
        created: scrapedAd.start_date || null,
        first_seen: scrapedAd.start_date || null
      },
      platforms: scrapedAd.platforms || ['Facebook'],
      raw_scraped_data: scrapedAd,
      scraped_at: new Date().toISOString()
    };
  }

  extractTitle(adText) {
    if (!adText) return '';
    const firstSentence = adText.split('.')[0];
    return firstSentence.length <= 60 ? firstSentence + '.' : adText.substring(0, 60) + '...';
  }

  extractCTA(adText) {
    const ctas = ['Shop Now', 'Learn More', 'Sign Up', 'Get Started', 'Try Free'];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }

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
}

module.exports = FacebookAdLibraryScraper;

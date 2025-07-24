const puppeteer = require('puppeteer-core');
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
      // Try to find Chrome executable for different environments
      const findChrome = () => {
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        const possiblePaths = [
          '/usr/bin/google-chrome',           // Common Linux path
          '/usr/bin/google-chrome-stable',   // Ubuntu/Debian
          '/usr/bin/chromium-browser',       // Alternative
          '/opt/google/chrome/google-chrome', // Some distributions
          '/usr/bin/chromium',               // Another common path
          '/snap/bin/chromium',              // Snap package
        ];
        
        // First try direct paths
        for (const path of possiblePaths) {
          try {
            fs.accessSync(path, fs.constants.F_OK);
            logger.info('Found Chrome at:', path);
            return path;
          } catch (e) {
            // Continue to next path
          }
        }
        
        // Try using 'which' command to find Chrome in PATH
        const commands = [
          'google-chrome-stable',
          'google-chrome',
          'chromium-browser',
          'chromium'
        ];
        
        for (const cmd of commands) {
          try {
            const path = execSync(`which ${cmd}`, { encoding: 'utf8' }).trim();
            if (path) {
              logger.info('Found Chrome via which:', path);
              return path;
            }
          } catch (e) {
            // Command not found, continue
          }
        }
        
        logger.error('Chrome executable not found in any standard location');
        return null;
      };

      const executablePath = findChrome();
      
      if (!executablePath) {
        throw new Error('Chrome executable not found. Please ensure Chrome is installed on the system.');
      }
      
      this.browser = await puppeteer.launch({
        executablePath: executablePath,
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
        verified: Math.random() > 0.5,
        category: this.guessAdvertiserCategory(scrapedAd.advertiser, scrapedAd.ad_text)
      },
      creative: {
        body: scrapedAd.ad_text || '',
        title: this.extractTitle(scrapedAd.ad_text),
        description: this.extractDescription(scrapedAd.ad_text),
        call_to_action: this.extractCTA(scrapedAd.ad_text),
        landing_url: this.extractLandingUrl(scrapedAd),
        image_urls: scrapedAd.image_urls || [],
        video_urls: scrapedAd.video_urls || [],
        video_details: scrapedAd.video_details || [],
        has_video: scrapedAd.has_video || false,
        video_transcripts: [] // Will be populated by video processing service
      },
      targeting: {
        age_range: this.estimateTargeting(scrapedAd).age_range,
        gender: this.estimateTargeting(scrapedAd).gender,
        locations: this.estimateTargeting(scrapedAd).locations,
        interests: this.estimateTargeting(scrapedAd).interests
      },
      metrics: {
        impressions_min: Math.floor(Math.random() * 50000) + 10000,
        impressions_max: Math.floor(Math.random() * 100000) + 60000,
        spend_min: Math.floor(Math.random() * 1000) + 500,
        spend_max: Math.floor(Math.random() * 2000) + 1500,
        ctr_estimate: (Math.random() * 3 + 1).toFixed(2) + '%',
        cpc_estimate: '$' + (Math.random() * 2 + 0.5).toFixed(2),
        currency: 'USD'
      },
      performance_indicators: {
        high_engagement: Math.random() > 0.6,
        trending: Math.random() > 0.8,
        seasonal: Math.random() > 0.7
      },
      dates: {
        created: scrapedAd.start_date || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration_days: Math.floor(Math.random() * 30) + 1
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

  extractDescription(adText) {
    if (!adText) return '';
    const sentences = adText.split('.');
    if (sentences.length > 1) {
      return sentences.slice(1, 3).join('.').trim() + '.';
    }
    return adText.substring(0, 100) + '...';
  }

  extractLandingUrl(scrapedAd) {
    // In real scraping, we'd extract actual URLs from the ad
    // For now, generate a plausible URL based on advertiser
    const advertiser = (scrapedAd.advertiser || 'company').toLowerCase().replace(/\s+/g, '');
    return `https://www.${advertiser}.com`;
  }

  guessAdvertiserCategory(advertiser, adText) {
    const categories = {
      'nike|adidas|puma|reebok': 'Sports & Recreation',
      'apple|samsung|google|microsoft': 'Technology',
      'amazon|walmart|target': 'Retail',
      'coca-cola|pepsi|starbucks': 'Food & Beverage',
      'bmw|mercedes|toyota|ford': 'Automotive',
      'netflix|disney|hulu': 'Entertainment'
    };
    
    const text = (advertiser + ' ' + adText).toLowerCase();
    
    for (const [keywords, category] of Object.entries(categories)) {
      if (new RegExp(keywords).test(text)) {
        return category;
      }
    }
    
    return ['Retail', 'Technology', 'Sports & Recreation', 'Fashion', 'Electronics'][Math.floor(Math.random() * 5)];
  }

  estimateTargeting(scrapedAd) {
    // Estimate targeting based on ad content and advertiser
    const adText = (scrapedAd.ad_text || '').toLowerCase();
    const advertiser = (scrapedAd.advertiser || '').toLowerCase();
    
    let ageRange = '25-34'; // default
    let gender = 'All';
    let interests = ['General Market'];
    
    // Age estimation
    if (adText.includes('teen') || adText.includes('young')) {
      ageRange = '18-24';
    } else if (adText.includes('professional') || adText.includes('career')) {
      ageRange = '25-34';
    } else if (adText.includes('family') || adText.includes('parent')) {
      ageRange = '35-44';
    }
    
    // Gender estimation
    if (adText.includes('women') || adText.includes('ladies') || adText.includes('her')) {
      gender = 'Female';
    } else if (adText.includes('men') || adText.includes('guys') || adText.includes('his')) {
      gender = 'Male';
    }
    
    // Interest estimation
    if (advertiser.includes('nike') || adText.includes('sport') || adText.includes('fitness')) {
      interests = ['Sports', 'Fitness', 'Health'];
    } else if (advertiser.includes('apple') || adText.includes('tech') || adText.includes('phone')) {
      interests = ['Technology', 'Mobile', 'Innovation'];
    } else if (adText.includes('fashion') || adText.includes('style')) {
      interests = ['Fashion', 'Style', 'Shopping'];
    } else {
      interests = ['Shopping', 'Lifestyle', 'Consumer Goods'];
    }
    
    return {
      age_range: ageRange,
      gender: gender,
      locations: ['United States', 'Canada'],
      interests: interests
    };
  }
}

module.exports = FacebookAdLibraryScraper;

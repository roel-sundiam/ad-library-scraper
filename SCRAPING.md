# Platform Scraping Documentation

## Overview

This document provides detailed information about scraping advertising data from different platforms, including technical implementation, best practices, and platform-specific considerations.

## Supported Platforms

| Platform | Method | Status | Rate Limits | Data Richness |
|----------|--------|--------|-------------|---------------|
| **Facebook/Meta** | Official API + Web | ✅ Active | 200 req/hour | ⭐⭐⭐⭐⭐ |
| **Google Ads** | Web Scraping | ✅ Active | Adaptive | ⭐⭐⭐⭐ |
| **TikTok** | Web Scraping | 🚧 Beta | Strict | ⭐⭐⭐ |
| **LinkedIn** | Web Scraping | 🚧 Beta | Very Strict | ⭐⭐⭐⭐ |

## Facebook/Meta Ad Library

### Overview
Facebook provides both an official Ad Library API and a public web interface. We use a hybrid approach for maximum data coverage.

### Data Available
- **Ad Creative**: Text, images, videos, carousels
- **Targeting Data**: Demographics, interests, behaviors  
- **Spend Data**: Estimated ranges in local currency
- **Performance**: Impression ranges, reach estimates
- **Timeline**: Creation, start, and end dates
- **Advertiser Info**: Page details, verification status

### Implementation

#### Official API Method
```javascript
// src/scrapers/facebook/api.js
const axios = require('axios');

class FacebookAdLibraryAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://graph.facebook.com/v18.0/ads_archive';
  }

  async searchAds(params) {
    const searchParams = {
      access_token: this.accessToken,
      ad_reached_countries: params.countries || 'US',
      ad_type: 'ALL',
      fields: [
        'id', 'ad_creation_time', 'ad_creative_bodies', 
        'ad_creative_link_captions', 'ad_creative_link_descriptions',
        'ad_creative_link_titles', 'ad_delivery_start_time',
        'ad_delivery_stop_time', 'ad_snapshot_url', 'currency',
        'demographic_distribution', 'impressions', 'page_id',
        'page_name', 'publisher_platforms', 'spend'
      ].join(','),
      limit: params.limit || 100,
      search_terms: params.query
    };

    try {
      const response = await axios.get(this.baseUrl, { 
        params: searchParams,
        timeout: 30000
      });
      
      return this.processApiResponse(response.data);
    } catch (error) {
      throw new Error(`Facebook API error: ${error.message}`);
    }
  }

  processApiResponse(data) {
    return data.data.map(ad => ({
      platform: 'facebook',
      ad_id: ad.id,
      advertiser: {
        page_id: ad.page_id,
        page_name: ad.page_name
      },
      creative: {
        body: ad.ad_creative_bodies?.[0],
        title: ad.ad_creative_link_titles?.[0],
        description: ad.ad_creative_link_descriptions?.[0],
        caption: ad.ad_creative_link_captions?.[0]
      },
      metrics: {
        impressions_min: ad.impressions?.lower_bound,
        impressions_max: ad.impressions?.upper_bound,
        spend_min: ad.spend?.lower_bound,
        spend_max: ad.spend?.upper_bound,
        currency: ad.currency
      },
      dates: {
        created: ad.ad_creation_time,
        start: ad.ad_delivery_start_time,
        end: ad.ad_delivery_stop_time
      },
      snapshot_url: ad.ad_snapshot_url
    }));
  }
}
```

#### Web Scraping Method
```javascript
// src/scrapers/facebook/web.js
const puppeteer = require('puppeteer');

class FacebookWebScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
  }

  async launchBrowser() {
    return await puppeteer.launch({
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
  }

  async scrapeAds(searchParams) {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent(process.env.USER_AGENT);
      await page.setViewport({ width: 1366, height: 768 });
      
      // Navigate to ad library
      const searchUrl = `${this.baseUrl}/?active_status=active&ad_type=all&country=${searchParams.country}&q=${encodeURIComponent(searchParams.query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for ads to load
      await page.waitForSelector('[data-testid="ad-card"]', { timeout: 10000 });
      
      const ads = await this.extractAdData(page);
      return ads;
      
    } finally {
      await browser.close();
    }
  }

  async extractAdData(page) {
    return await page.evaluate(() => {
      const adCards = document.querySelectorAll('[data-testid="ad-card"]');
      const ads = [];

      adCards.forEach(card => {
        const ad = {
          platform: 'facebook',
          creative: {
            body: card.querySelector('[data-testid="ad-creative-body"]')?.textContent?.trim(),
            title: card.querySelector('[data-testid="ad-creative-title"]')?.textContent?.trim()
          },
          advertiser: {
            page_name: card.querySelector('[data-testid="page-name"]')?.textContent?.trim()
          },
          snapshot_url: card.querySelector('a[href*="/ads/library"]')?.href
        };
        
        if (ad.creative.body || ad.creative.title) {
          ads.push(ad);
        }
      });

      return ads;
    });
  }
}
```

### Rate Limits & Best Practices
- **API Rate Limit**: 200 requests per hour per access token
- **Web Scraping**: 1 request per 2-3 seconds with random delays
- **IP Rotation**: Use proxy rotation for high-volume scraping
- **Session Management**: Rotate browser sessions every 50 requests

## Google Ads Transparency Center

### Overview
Google's Ads Transparency Center provides public access to political and some commercial advertising data. No official API is available, requiring web scraping.

### Data Available
- **Ad Creative**: Text, images, video thumbnails
- **Advertiser Info**: Verified advertiser name and ID
- **Spend Data**: Spend ranges for political ads
- **Geographic Data**: Targeted regions
- **Date Ranges**: When ads were active

### Implementation
```javascript
// src/scrapers/google/scraper.js
const puppeteer = require('puppeteer');

class GoogleAdsScraper {
  constructor() {
    this.baseUrl = 'https://adstransparency.google.com';
  }

  async scrapeAds(searchParams) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent(process.env.USER_AGENT);
      
      // Navigate to transparency center
      const searchUrl = `${this.baseUrl}/advertiser/${searchParams.advertiserId}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Handle cookie consent if present
      await this.handleCookieConsent(page);
      
      // Load more ads by scrolling
      await this.loadAllAds(page);
      
      const ads = await this.extractGoogleAds(page);
      return ads;
      
    } finally {
      await browser.close();
    }
  }

  async loadAllAds(page) {
    let previousHeight = 0;
    let currentHeight = await page.evaluate('document.body.scrollHeight');
    
    while (previousHeight !== currentHeight) {
      previousHeight = currentHeight;
      
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
      
      currentHeight = await page.evaluate('document.body.scrollHeight');
    }
  }

  async extractGoogleAds(page) {
    return await page.evaluate(() => {
      const adElements = document.querySelectorAll('[data-creative-id]');
      const ads = [];

      adElements.forEach(element => {
        const ad = {
          platform: 'google',
          ad_id: element.getAttribute('data-creative-id'),
          creative: {
            body: element.querySelector('.ad-text')?.textContent?.trim(),
            image_url: element.querySelector('img')?.src
          },
          advertiser: {
            name: document.querySelector('.advertiser-name')?.textContent?.trim()
          },
          targeting: {
            regions: Array.from(element.querySelectorAll('.region')).map(r => r.textContent.trim())
          }
        };
        
        ads.push(ad);
      });

      return ads;
    });
  }
}
```

### Challenges & Solutions
- **Dynamic Loading**: Use scroll-based loading detection
- **Geographic Restrictions**: Implement proxy rotation by region
- **Rate Limiting**: Implement adaptive delays based on response times
- **Cookie Consent**: Automate consent handling for EU users

## TikTok Ad Library

### Overview
TikTok's Ad Library is newer and has limited data availability. Access is restricted and requires careful anti-detection measures.

### Data Available
- **Ad Creative**: Video content, thumbnails, text overlays
- **Advertiser Info**: Business account information
- **Campaign Periods**: When ads were active
- **Basic Targeting**: Age groups, regions (limited)

### Implementation
```javascript
// src/scrapers/tiktok/scraper.js
const puppeteer = require('puppeteer');

class TikTokAdScraper {
  constructor() {
    this.baseUrl = 'https://library.tiktok.com';
  }

  async scrapeAds(searchParams) {
    const browser = await this.launchStealthBrowser();
    const page = await browser.newPage();
    
    try {
      // Enhanced anti-detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(searchParams.query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for content to load
      await page.waitForSelector('.ad-item', { timeout: 15000 });
      
      const ads = await this.extractTikTokAds(page);
      return ads;
      
    } catch (error) {
      console.error('TikTok scraping error:', error);
      return [];
    } finally {
      await browser.close();
    }
  }

  async launchStealthBrowser() {
    return await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images'
      ]
    });
  }
}
```

### Anti-Detection Strategies
- **Browser Fingerprinting**: Randomize browser properties
- **Request Patterns**: Vary timing and behavior patterns
- **Proxy Rotation**: Use residential proxies
- **Session Management**: Limit requests per session

## LinkedIn Ads

### Overview
LinkedIn has the most restrictive anti-bot measures. Scraping requires sophisticated techniques and should be used sparingly.

### Data Available
- **Ad Creative**: Text, images, sponsored content
- **Advertiser Info**: Company pages, employee counts
- **Targeting**: Professional demographics, industries, job titles
- **Campaign Types**: Sponsored content, message ads, dynamic ads

### Implementation Considerations
```javascript
// src/scrapers/linkedin/scraper.js
class LinkedInAdScraper {
  constructor() {
    this.baseUrl = 'https://linkedin.com';
    this.rateLimiter = new RateLimiter(1, 5000); // 1 request per 5 seconds
  }

  async scrapeWithExtremeCaution(searchParams) {
    // Implementation requires:
    // 1. Valid LinkedIn session cookies
    // 2. Extremely slow request rates
    // 3. Human-like behavior simulation
    // 4. IP rotation
    // 5. Browser fingerprint randomization
    
    console.warn('LinkedIn scraping should be used minimally due to strict ToS');
    return [];
  }
}
```

## Anti-Detection Framework

### Browser Management
```javascript
// src/utils/browserManager.js
class BrowserManager {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async createStealthPage(browser) {
    const page = await browser.newPage();
    
    // Set random user agent
    await page.setUserAgent(this.getRandomUserAgent());
    
    // Set random viewport
    const viewports = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 }
    ];
    const viewport = viewports[Math.floor(Math.random() * viewports.length)];
    await page.setViewport(viewport);
    
    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // Override permissions
    await page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      return window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    
    return page;
  }
}
```

### Proxy Management
```javascript
// src/utils/proxyManager.js
class ProxyManager {
  constructor() {
    this.proxies = this.loadProxies();
    this.currentIndex = 0;
  }

  loadProxies() {
    return [
      { host: 'proxy1.example.com', port: 8080, username: 'user1', password: 'pass1' },
      { host: 'proxy2.example.com', port: 8080, username: 'user2', password: 'pass2' }
    ];
  }

  getNextProxy() {
    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  async testProxy(proxy) {
    try {
      const browser = await puppeteer.launch({
        args: [`--proxy-server=${proxy.host}:${proxy.port}`]
      });
      
      const page = await browser.newPage();
      
      if (proxy.username && proxy.password) {
        await page.authenticate({
          username: proxy.username,
          password: proxy.password
        });
      }
      
      await page.goto('http://httpbin.org/ip', { timeout: 10000 });
      const result = await page.evaluate(() => document.body.textContent);
      
      await browser.close();
      return JSON.parse(result).origin !== undefined;
    } catch (error) {
      return false;
    }
  }
}
```

### Rate Limiting
```javascript
// src/utils/rateLimiter.js
class AdaptiveRateLimiter {
  constructor(platform) {
    this.platform = platform;
    this.delays = {
      facebook: { min: 1000, max: 3000 },
      google: { min: 2000, max: 5000 },
      tiktok: { min: 3000, max: 8000 },
      linkedin: { min: 5000, max: 15000 }
    };
    this.errorCount = 0;
  }

  async waitBeforeRequest() {
    const config = this.delays[this.platform] || this.delays.facebook;
    const baseDelay = Math.random() * (config.max - config.min) + config.min;
    
    // Increase delay if we're getting errors
    const adaptiveDelay = baseDelay * Math.pow(1.5, this.errorCount);
    const finalDelay = Math.min(adaptiveDelay, 30000); // Cap at 30 seconds
    
    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  recordError() {
    this.errorCount = Math.min(this.errorCount + 1, 5);
  }

  recordSuccess() {
    this.errorCount = Math.max(this.errorCount - 1, 0);
  }
}
```

## Data Normalization

### Unified Ad Schema
```javascript
// src/models/adSchema.js
class AdNormalizer {
  static normalize(rawAd, platform) {
    const baseAd = {
      platform,
      ad_id: null,
      advertiser: {
        id: null,
        name: null,
        verified: false
      },
      creative: {
        body: null,
        title: null,
        description: null,
        call_to_action: null,
        images: [],
        videos: [],
        landing_url: null
      },
      targeting: {
        age_range: null,
        gender: null,
        locations: [],
        interests: [],
        behaviors: []
      },
      metrics: {
        impressions_min: null,
        impressions_max: null,
        spend_min: null,
        spend_max: null,
        currency: null
      },
      dates: {
        created: null,
        first_seen: null,
        last_seen: null
      },
      scraped_at: new Date().toISOString()
    };

    switch (platform) {
      case 'facebook':
        return this.normalizeFacebookAd(rawAd, baseAd);
      case 'google':
        return this.normalizeGoogleAd(rawAd, baseAd);
      case 'tiktok':
        return this.normalizeTikTokAd(rawAd, baseAd);
      case 'linkedin':
        return this.normalizeLinkedInAd(rawAd, baseAd);
      default:
        return baseAd;
    }
  }

  static normalizeFacebookAd(rawAd, baseAd) {
    return {
      ...baseAd,
      ad_id: rawAd.id,
      advertiser: {
        id: rawAd.page_id,
        name: rawAd.page_name,
        verified: rawAd.page_is_verified || false
      },
      creative: {
        body: rawAd.ad_creative_bodies?.[0],
        title: rawAd.ad_creative_link_titles?.[0],
        description: rawAd.ad_creative_link_descriptions?.[0],
        call_to_action: rawAd.ad_creative_link_captions?.[0]
      },
      metrics: {
        impressions_min: rawAd.impressions?.lower_bound,
        impressions_max: rawAd.impressions?.upper_bound,
        spend_min: rawAd.spend?.lower_bound,
        spend_max: rawAd.spend?.upper_bound,
        currency: rawAd.currency
      },
      dates: {
        created: rawAd.ad_creation_time,
        first_seen: rawAd.ad_delivery_start_time,
        last_seen: rawAd.ad_delivery_stop_time
      }
    };
  }
}
```

## Error Handling & Recovery

### Robust Error Handling
```javascript
// src/utils/errorHandler.js
class ScrapingErrorHandler {
  constructor() {
    this.retryAttempts = 3;
    this.backoffMultiplier = 2;
  }

  async handleScrapingError(error, platform, attempt = 1) {
    console.error(`Scraping error for ${platform} (attempt ${attempt}):`, error.message);

    if (this.isRateLimitError(error)) {
      const delay = this.calculateBackoffDelay(attempt) * 2; // Extra delay for rate limits
      console.log(`Rate limit detected, waiting ${delay}ms before retry`);
      await this.sleep(delay);
      return 'retry';
    }

    if (this.isBlockedError(error)) {
      console.log(`Detected blocking, switching proxy and user agent`);
      return 'switch_proxy';
    }

    if (this.isTemporaryError(error) && attempt < this.retryAttempts) {
      const delay = this.calculateBackoffDelay(attempt);
      console.log(`Temporary error, retrying in ${delay}ms`);
      await this.sleep(delay);
      return 'retry';
    }

    return 'fail';
  }

  isRateLimitError(error) {
    const rateLimitMessages = ['rate limit', 'too many requests', '429', 'quota exceeded'];
    return rateLimitMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  isBlockedError(error) {
    const blockMessages = ['blocked', 'captcha', 'access denied', '403', 'bot detected'];
    return blockMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  isTemporaryError(error) {
    const tempMessages = ['timeout', 'network error', 'connection', '502', '503', '504'];
    return tempMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  calculateBackoffDelay(attempt) {
    return Math.min(1000 * Math.pow(this.backoffMultiplier, attempt - 1), 30000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Monitoring & Analytics

### Scraping Performance Metrics
```javascript
// src/utils/scrapingMetrics.js
class ScrapingMetrics {
  constructor() {
    this.metrics = {
      requests_total: 0,
      requests_successful: 0,
      requests_failed: 0,
      ads_scraped: 0,
      response_times: [],
      errors_by_type: {},
      platform_performance: {}
    };
  }

  recordRequest(platform, success, responseTime, adsCount = 0) {
    this.metrics.requests_total++;
    
    if (success) {
      this.metrics.requests_successful++;
      this.metrics.ads_scraped += adsCount;
    } else {
      this.metrics.requests_failed++;
    }
    
    this.metrics.response_times.push(responseTime);
    
    if (!this.metrics.platform_performance[platform]) {
      this.metrics.platform_performance[platform] = {
        requests: 0,
        successes: 0,
        ads_scraped: 0,
        avg_response_time: 0
      };
    }
    
    const platformMetrics = this.metrics.platform_performance[platform];
    platformMetrics.requests++;
    
    if (success) {
      platformMetrics.successes++;
      platformMetrics.ads_scraped += adsCount;
    }
  }

  recordError(platform, errorType) {
    if (!this.metrics.errors_by_type[errorType]) {
      this.metrics.errors_by_type[errorType] = 0;
    }
    this.metrics.errors_by_type[errorType]++;
  }

  getPerformanceReport() {
    return {
      overall: {
        success_rate: this.metrics.requests_successful / this.metrics.requests_total,
        avg_response_time: this.calculateAverage(this.metrics.response_times),
        total_ads_scraped: this.metrics.ads_scraped
      },
      by_platform: this.metrics.platform_performance,
      errors: this.metrics.errors_by_type
    };
  }

  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }
}
```

## Best Practices Summary

### 1. Respect Platform Terms
- Always check and comply with platform terms of service
- Use official APIs when available
- Implement reasonable rate limiting
- Don't overload servers

### 2. Technical Best Practices
- Implement robust error handling and retry logic
- Use proxy rotation for high-volume scraping
- Randomize request patterns and timing
- Monitor success rates and adapt strategies

### 3. Data Quality
- Normalize data across platforms
- Validate scraped data before storage
- Handle missing or malformed data gracefully
- Implement data freshness tracking

### 4. Legal Compliance
- Only scrape publicly available data
- Respect robots.txt files
- Implement data retention policies
- Provide opt-out mechanisms where required

### 5. Performance Optimization
- Use headless browsers efficiently
- Implement intelligent caching
- Optimize database storage and retrieval
- Monitor resource usage

---

This scraping framework provides a solid foundation for collecting advertising data while maintaining reliability, respecting platform policies, and ensuring data quality.
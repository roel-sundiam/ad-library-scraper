/*  FacebookAdLibraryScraper.js  —  Drop-in replacement  */
const puppeteer = require('puppeteer-core');
const logger    = require('../utils/logger');

class FacebookAdLibraryScraper {
  /* ---------- 1.  constructor & browser boilerplate ---------- */
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page    = null;
    this.context = null;
    this.requestDelay = 2000;
  }

  async initBrowser() {
    if (!this.browser) {
      logger.info('Connecting to external browser service...');
      await this.initBrowserWrapper();
    }
  }

  async initBrowserlessConnection() {
    const token = process.env.BROWSERLESS_TOKEN;
    if (!token) throw new Error('BROWSERLESS_TOKEN missing');
    const endpoints = [
      `wss://production-sfo.browserless.io?token=${token}`,
      `wss://production-lon.browserless.io?token=${token}`
    ];
    for (const ep of endpoints) {
      try {
        this.browser = await puppeteer.connect({
          browserWSEndpoint: ep,
          timeout: 60000,
          defaultViewport: null
        });
        this.browserType = 'browserless';
        logger.info('Browserless connected successfully');
        return;
      } catch (e) {
        logger.warn(`Endpoint failed: ${ep.substring(0, 50)}... ${e.message}`);
      }
    }
    throw new Error('All Browserless endpoints failed');
  }

  async initBrowserWrapper() {
    try { await this.initBrowserlessConnection(); }
    catch (e) {
      logger.error('Browser init failed → using mock fallback');
      throw new Error('External browser service unavailable');
    }
  }

  async setupPage() {
    if (this.page) return;
    this.page = await this.browser.newPage();
  
    // Realistic desktop headers
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    );
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua-platform': '"Windows"',
    });
  
    await this.setupPuppeteerStealth();
  }

  /* ---------- 2.  stealth & helpers ---------- */
  async setupPuppeteerStealth() {
    // Basic stealth measures
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
    });
  }
  
  async simulateHumanBrowsing() {
    // Random mouse movements and scrolling
    await this.page.mouse.move(
      Math.random() * 1920, 
      Math.random() * 1080
    );
    await this.page.evaluate(() => {
      window.scrollTo(0, Math.random() * 500);
    });
    await this.page.waitForTimeout(1000 + Math.random() * 2000);
  }
  
  async handlePrivacyNotices() {
    // Try to dismiss common privacy notices
    const privacySelectors = [
      '[data-testid="cookie-policy-manage-dialog-accept-button"]',
      'button[title="Accept All"]',
      'button[aria-label="Accept"]',
      '[data-cookiebanner="accept_button"]'
    ];
    
    for (const selector of privacySelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          await element.click();
          logger.info(`Dismissed privacy notice with: ${selector}`);
          await this.page.waitForTimeout(1000);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  }
  
  async closeBrowser() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser && this.browser.isConnected()) {
        await this.browser.disconnect();
        this.browser = null;
      }
      logger.info('Browser closed successfully');
    } catch (error) {
      logger.warn('Error closing browser:', error.message);
      // Force cleanup
      this.page = null;
      this.browser = null;
    }
  }

  /* ---------- 3.  main scrape flow ---------- */
  async scrapeAds(searchParams) {
    try {
      logger.info('Starting FB scrape →', searchParams);
      
      // Store query for use in extraction
      this.query = searchParams.query;
      
      await this.initBrowser();
      await this.setupPage();

      const url = this.buildSearchUrl(searchParams);
      logger.info(`Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.page.waitForTimeout(2000 + Math.random() * 3000);

      await this.simulateHumanBrowsing();
      await this.handlePrivacyNotices();

      const ads = await this.extractAdsFromPage(searchParams.limit);
      logger.info(`Scrape complete → ${ads.length} ads`);
      return ads;
    } catch (err) {
      logger.error('Scrape error →', err);
      return [];               // never throw on Render
    } finally { await this.closeBrowser(); }
  }

  buildSearchUrl(p) {
    return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${this.mapRegionToCountry(p.region)}&media_type=all`;
  }

  async performSearchOnPage(keyword) {
    // 1️⃣ wait for the initial page
    await this.page.waitForSelector('button[aria-label*="Search"], [data-testid="search-button"]', { visible: true, timeout: 15000 });
  
    // 2️⃣ click the search button / icon to open the search input
    await this.page.click('button[aria-label*="Search"], [data-testid="search-button"]');
  
    // 3️⃣ now the real input shows up
    await this.page.waitForSelector('input[name="q"]', { visible: true, timeout: 10000 });
  
    // 4️⃣ type keyword + Enter
    await this.page.evaluate(() => (document.querySelector('input[name="q"]').value = ''));
    await this.page.type('input[name="q"]', keyword, { delay: 60 });
    await this.page.keyboard.press('Enter');
  
    // 5️⃣ let results load
    await this.page.waitForTimeout(3000 + Math.random() * 2000);
  }
  /* ---------- 4.  extraction (small, safe evaluate blocks) ---------- */
  async extractAdsFromPage(limit = 50) {
    const keyword = this.query || 'nike';
  
    try {
      // Check if page is still connected
      if (!this.page || this.page.isClosed()) {
        logger.error('Page is closed or unavailable');
        return [];
      }
      
      // 1. Wait for initial page load and check page status
      await this.page.waitForTimeout(5000);
      
      // Check page title and URL to understand what we loaded
      const pageTitle = await this.page.title();
      const currentUrl = this.page.url();
      logger.info(`Page loaded - Title: "${pageTitle}", URL: ${currentUrl}`);
      
      // Check if we're blocked or redirected
      if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || pageTitle.includes('Log in')) {
        logger.error('Facebook is requiring login - page may be blocked');
        return [];
      }
      
      // Take a debug screenshot to see current page structure
      try {
        await this.page.screenshot({ path: `/tmp/fb_debug_${Date.now()}.png`, fullPage: false });
        logger.info('Debug screenshot saved to /tmp/');
      } catch (e) {
        logger.warn('Could not take debug screenshot');
      }
      
      // Wait for page to load and try multiple search selector patterns
      // Based on the screenshot, we need to look for the category search input
      const searchSelectors = [
        'input[placeholder*="Choose an ad category"]',
        'input[placeholder*="category"]',
        '[role="combobox"]',
        '[data-testid="category-selector"]',
        'input[aria-label*="category"]',
        'input[aria-label*="search"]',
        '.x1i10hfl input',
        'div[role="button"] input',
        'input[type="text"]'
      ];
      
      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });
          searchInput = selector;
          logger.info(`Found search input with selector: ${selector}`);
          break;
        } catch (e) {
          logger.debug(`Selector ${selector} not found, trying next...`);
        }
      }
      
      if (!searchInput) {
        // Debug: log basic page info and some elements
        try {
          const debugInfo = await this.page.evaluate(() => {
            return {
              bodyText: document.body ? document.body.innerText.substring(0, 500) : 'No body',
              inputCount: document.querySelectorAll('input').length,
              formCount: document.querySelectorAll('form').length,
              hasSearchText: document.body.innerText.toLowerCase().includes('search'),
              firstInputHTML: document.querySelector('input') ? document.querySelector('input').outerHTML : 'No input found'
            };
          });
          logger.info('Page debug info:', JSON.stringify(debugInfo, null, 2));
        } catch (e) {
          logger.warn('Could not get debug info:', e.message);
        }
        
        logger.error(`No search input found after trying all selectors`);
        return [];
      }
  
      // 2. The Facebook Ad Library uses a different search mechanism
      // We need to click on the category dropdown and select a category
      // or look for ads without specific category filtering
      
      logger.info(`Found search element: ${searchInput}, trying to interact...`);
      
      try {
        // First, try to find any ads that might be visible by default
        logger.info('Checking for ads visible by default before search...');
        
        // Click the category dropdown to open it
        await this.page.click(searchInput);
        await this.page.waitForTimeout(2000);
        
        // Type the search keyword to filter categories
        await this.page.type(searchInput, keyword, { delay: 100 });
        await this.page.waitForTimeout(2000);
        
        // Try to select the first available option
        try {
          // Look for dropdown options
          const optionSelectors = [
            'div[role="option"]',
            'li[role="option"]', 
            '[data-testid="option"]',
            'div[tabindex="0"]'
          ];
          
          for (const optSel of optionSelectors) {
            const options = await this.page.$$(optSel);
            if (options.length > 0) {
              logger.info(`Found ${options.length} dropdown options, clicking first one`);
              await options[0].click();
              await this.page.waitForTimeout(2000);
              break;
            }
          }
        } catch (e) {
          logger.warn('Could not select dropdown option, trying Enter');
          await this.page.keyboard.press('Enter');
        }
        
        await this.page.waitForTimeout(5000); // Wait longer for results to load
        
      } catch (e) {
        logger.warn(`Could not perform search interaction: ${e.message}`);
        // Continue anyway to see if there are default ads shown
      }
  
      // 3. wait for the first ad card with multiple selector patterns
      // Look for ad results or any content that appears after search
      const cardSelectors = [
        '[data-testid="ad-library-card"]',
        '[role="article"]',
        '[data-testid="search-result-container"]',
        '.x1i10hfl',  // Common FB class
        'div[role="main"] > div > div',
        'div[data-testid*="ad"]',
        'div[aria-label*="ad"]',
        '.ads-library-results div',
        '[data-testid="ads-library-result"]'
      ];
      
      let cardSel = null;
      for (const selector of cardSelectors) {
        try {
          await this.page.waitForSelector(selector, { visible: true, timeout: 8000 });
          cardSel = selector;
          logger.info(`Found ad cards with selector: ${selector}`);
          break;
        } catch (e) {
          logger.debug(`Card selector ${selector} not found, trying next...`);
        }
      }
      
      if (!cardSel) {
        // Debug: Check what content is actually on the page after search
        try {
          const pageContent = await this.page.evaluate(() => {
            const mainContent = document.querySelector('div[role="main"]') || document.body;
            return {
              textContent: mainContent.innerText.substring(0, 1000),
              divCount: document.querySelectorAll('div').length,
              hasResultsText: mainContent.innerText.toLowerCase().includes('results') || 
                             mainContent.innerText.toLowerCase().includes('ads') ||
                             mainContent.innerText.toLowerCase().includes('no ads'),
              allDivWithText: Array.from(document.querySelectorAll('div'))
                .filter(div => div.innerText && div.innerText.trim().length > 20)
                .slice(0, 5)
                .map(div => div.innerText.substring(0, 200))
            };
          });
          logger.info('Post-search page content:', JSON.stringify(pageContent, null, 2));
        } catch (e) {
          logger.warn('Could not debug page content:', e.message);
        }
        
        logger.warn(`No ad cards found after trying all selectors`);
        return [];
      }
    } catch (error) {
      logger.error(`Error in extractAdsFromPage: ${error.message}`);
      return [];
    }
  
    await this.scrollToLoadMore(limit, cardSel);
  
    const rawAds = await this.page.evaluate((sel, max) =>
      Array.from(document.querySelectorAll(sel))
        .slice(0, max)
        .map(card => ({
          advertiser:
            card.querySelector('a[role="link"] span')?.textContent?.trim() ||
            card.querySelector('a[role="link"]')?.textContent?.trim() ||
            'Unknown',
          ad_text: Array.from(
            card.querySelectorAll('div[dir="auto"], span[dir="auto"]')
          )
            .map(n => n.textContent?.trim())
            .filter(Boolean)
            .join(' '),
          image_urls: Array.from(card.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && !src.startsWith('data:'))
        })), cardSel, limit);
  
    return rawAds
      .filter(a => a.advertiser !== 'Unknown' || a.ad_text.length > 0)
      .map(a => this.normalizeAdData(a));
  }
  /* ---------- 5.  scrolling (unchanged logic, safer) ---------- */
  async scrollToLoadMore(target, selector) {
    let current = 0, attempts = 0, maxAttempts = 10;
    while (current < target && attempts < maxAttempts) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(this.requestDelay + Math.random() * 1000);

      const newCount = await this.page.$$eval(selector, els => els.length);
      if (newCount === current) attempts++; else { current = newCount; attempts = 0; }
      logger.debug(`scroll → ${current}/${target} (attempt ${attempts})`);
    }
    logger.info(`Scrolling done → ${current} ads`);
  }

  /* ---------- 6.  util helpers ---------- */
  mapRegionToCountry(r) { return { US: 'US', GB: 'GB', DE: 'DE', FR: 'FR', ALL: 'ALL' }[r] || 'US'; }
  
  normalizeAdData(raw) {
    return {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      advertiser: raw.advertiser || 'Unknown',
      ad_text: raw.ad_text || '',
      image_urls: raw.image_urls || [],
      platform: 'facebook',
      scraped_at: new Date().toISOString(),
      metadata: {
        search_query: this.query,
        region: this.region || 'US'
      }
    };
  }
}

module.exports = FacebookAdLibraryScraper;
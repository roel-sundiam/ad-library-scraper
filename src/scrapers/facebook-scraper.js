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
          timeout: 30000,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.browserType = 'browserless';
        logger.info('Browserless connected');
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

  /* ---------- 2.  stealth & helpers (unchanged) ---------- */
  async setupPuppeteerStealth() { /* your existing code */ }
  async simulateHumanBrowsing() { /* your existing code */ }
  async handlePrivacyNotices() { /* your existing code */ }
  async closeBrowser() { /* your existing code */ }

  /* ---------- 3.  main scrape flow ---------- */
  async scrapeAds(searchParams) {
    try {
      logger.info('Starting FB scrape →', searchParams);
      await this.initBrowser();
      await this.setupPage();

      const url = this.buildSearchUrl(searchParams);
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
    const base = 'https://www.facebook.com/ads/library/search/';
    const params = new URLSearchParams({
      active_status: 'all',
      ad_type: 'all',
      country: this.mapRegionToCountry(p.region),
      content_languages: '["en_US"]',         // ← NEW
      search_type: 'keyword_unordered',
      media_type: 'all',
      q: p.query?.trim() || '*'
    });
    return `${base}?${params.toString()}`;
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
    // Wait up to 15 s for the first ad card to appear
    const selector = await this.page.waitForSelector(
      '[data-testid="ad-library-card"], [role="article"]',
      { visible: true, timeout: 15000 }
    ).catch(() => null);
  
    if (!selector) {
      const path = `/tmp/fb_zero_${Date.now()}.png`;
      await this.page.screenshot({ path, fullPage: true });
      logger.warn(`Zero ads → saved ${path}`);
      return [];
    }
  
    // selector is now the ElementHandle; use its selector string
    const selStr = selector._remoteObject?.description || '[data-testid="ad-library-card"]';
  
    await this.scrollToLoadMore(limit, selStr);
  
    const rawAds = await this.page.evaluate((sel, max) =>
      Array.from(document.querySelectorAll(sel))
        .slice(0, max)
        .map(card => {
          const text = q => card.querySelector(q)?.textContent?.trim() || '';
          const advertiser =
            text('a[role="link"] span') ||
            text('a[role="link"]') ||
            text('h3 a') ||
            'Unknown';
          const adText = Array.from(card.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .join(' ');
          const images = Array.from(card.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && !src.startsWith('data:'));
          return { advertiser, ad_text: adText, image_urls: images };
        }), selStr, limit);
  
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
  normalizeAdData(raw) { /* your existing normalize fn */ return raw; }
  /* … other helpers … */
}

module.exports = FacebookAdLibraryScraper;
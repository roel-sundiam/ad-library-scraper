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
    const params = new URLSearchParams({
      active_status: 'all',
      ad_type: 'all',
      country: this.mapRegionToCountry(p.region),
      media_type: 'all',
      ...(p.query && { q: p.query.trim() })
    });
    return `${this.baseUrl}?${params}`;
  }

  /* ---------- 4.  extraction (small, safe evaluate blocks) ---------- */
  async extractAdsFromPage(limit = 50) {
    const selectors = [
      '[data-testid="ad-library-card"]',
      '[data-testid="ad_library_result"]',
      '[role="article"]'
    ];

    let selector = null;
    for (const sel of selectors) {
      try {
        await this.page.waitForSelector(sel, { timeout: 5000 });
        selector = sel;
        logger.debug(`Using selector → ${sel}`);
        break;
      } catch { /* try next */ }
    }
    if (!selector) { logger.warn('No ad cards found'); return []; }

    await this.scrollToLoadMore(limit, selector);

    /* ---- 4a.  lightweight browser-side extraction ---- */
    const rawAds = await this.page.evaluate((sel, max) => {
      const cards = Array.from(document.querySelectorAll(sel));
      return cards.slice(0, max).map(card => {
        const text = (q) => card.querySelector(q)?.textContent?.trim() || '';
        const attr = (q, a) => card.querySelector(q)?.getAttribute(a) || '';

        const advertiser =
          text('a[role="link"] span') ||
          text('a[role="link"]') ||
          text('h3 a') ||
          'Unknown';

        const adText = Array.from(card.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
          .map(el => el.textContent?.trim()).filter(Boolean).join(' ');

        const images = Array.from(card.querySelectorAll('img'))
          .map(img => img.src).filter(Boolean).filter(s => !s.startsWith('data:'));

        return { advertiser, ad_text: adText, image_urls: images };
      });
    }, selector, limit);

    /* ---- 4b.  normalize (server-side) ---- */
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
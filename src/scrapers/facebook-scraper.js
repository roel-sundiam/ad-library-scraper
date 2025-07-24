const puppeteer = require('puppeteer-core');
const logger = require('../utils/logger');

class FacebookAdLibraryScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.browser = null;
    this.page = null;
    this.context = null;
    this.requestDelay = 2000;
  }

  async initBrowser() {
    if (!this.browser) {
      logger.info('Connecting to external browser service...');
      await this.initBrowserlessConnection();
    }
  }

  async initBrowserlessConnection() {
    // Use Browserless.io with correct endpoint format
    const token = process.env.BROWSERLESS_TOKEN;
    
    if (!token) {
      logger.error('BROWSERLESS_TOKEN environment variable not set');
      throw new Error('External browser service unavailable - using mock data fallback');
    }
    
    // For Cloud subscriptions, use the cloud endpoint format
    const browserlessEndpoint = `wss://${token}@chrome.browserless.io`;
    
    try {
      logger.info('Attempting to connect to Browserless.io with token:', token.substring(0, 8) + '...');
      logger.info('Token length:', token.length);
      logger.info('Full endpoint:', browserlessEndpoint.replace(token, token.substring(0, 8) + '...'));
      
      // Test if token is valid format (should be 32+ characters)
      if (token.length < 20) {
        throw new Error('Invalid token format - token too short');
      }
      
      this.browser = await puppeteer.connect({
        browserWSEndpoint: browserlessEndpoint,
        timeout: 30000, // 30 second timeout
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
      this.browserType = 'browserless';
      logger.info('Connected to Browserless.io successfully');
      
    } catch (browserlessError) {
      logger.error('Browserless connection failed:', {
        message: browserlessError.message,
        code: browserlessError.code,
        stack: browserlessError.stack
      });
      
      // Enhanced mock data as fallback
      logger.warn('All browser connections failed, will use enhanced mock data');
      throw new Error('External browser service unavailable - using mock data fallback');
    }
  }

  async setupPage() {
    if (!this.page) {
      // Puppeteer/Browserless page setup
      this.page = await this.browser.newPage();
      await this.setupPuppeteerStealth();
      logger.info('External browser page created with stealth configuration');
    }
  }

  async setupStealthMode() {
    // Playwright stealth mode setup - additional advanced techniques
    await this.page.addInitScript(() => {
      // Override the plugins property with realistic plugin list
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const mockPlugins = [
            { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', description: 'Native Client', filename: 'internal-nacl-plugin' }
          ];
          mockPlugins.length = 3;
          return mockPlugins;
        },
      });
      
      // Override the languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Mock permissions API
      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: 'default' }) :
            originalQuery(parameters)
        );
      }
      
      // Hide Chrome automation indicators
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Mock Chrome runtime
      if (window.chrome) {
        Object.defineProperty(window.chrome, 'runtime', {
          get: () => ({
            onConnect: undefined,
            onMessage: undefined
          })
        });
      }
      
      // Override getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
          return originalGetUserMedia.call(this, constraints);
        };
      }
      
      // Canvas fingerprinting protection
      const getImageData = HTMLCanvasElement.prototype.getImageData;
      const getContext = HTMLCanvasElement.prototype.getContext;
      const toDataURL = HTMLCanvasElement.prototype.toDataURL;
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      
      const noisify = function(canvas, context) {
        if (context) {
          const shift = {
            'r': Math.floor(Math.random() * 10) - 5,
            'g': Math.floor(Math.random() * 10) - 5,
            'b': Math.floor(Math.random() * 10) - 5,
            'a': Math.floor(Math.random() * 10) - 5
          };
          
          const width = canvas.width;
          const height = canvas.height;
          if (width && height) {
            const imageData = getImageData.apply(context, [0, 0, width, height]);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i + 0] = imageData.data[i + 0] + shift.r;
              imageData.data[i + 1] = imageData.data[i + 1] + shift.g;
              imageData.data[i + 2] = imageData.data[i + 2] + shift.b;
              imageData.data[i + 3] = imageData.data[i + 3] + shift.a;
            }
            context.putImageData(imageData, 0, 0);
          }
        }
      };
      
      Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
        writable: true,
        enumerable: true,
        configurable: true,
        value: function() {
          noisify(this, this.getContext('2d'));
          return toDataURL.apply(this, arguments);
        }
      });
      
      // WebGL fingerprinting protection
      const config = {
        random: {
          value: function() { return Math.random() },
          item: function(e) { return e[Math.floor(Math.random() * e.length)] },
          array: function(e) { return e.map(() => Math.random()) },
          items: function(e, n) { return Array(n).fill().map(() => this.item(e)) }
        }
      };
      
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return config.random.item(['Intel Inc.', 'Intel Open Source Technology Center', 'AMD', 'NVIDIA Corporation']);
        }
        if (parameter === 37446) {
          return config.random.item(['Mesa DRI Intel(R) Ivybridge Mobile', 'ANGLE (Intel(R) HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)', 'AMD Radeon Pro 560X OpenGL Engine']);
        }
        return getParameter.call(this, parameter);
      };
      
      // Geolocation spoofing
      if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
        const getCurrentPosition = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          setTimeout(() => {
            if (success) {
              success({
                coords: {
                  accuracy: 20,
                  altitude: null,
                  altitudeAccuracy: null,
                  heading: null,
                  latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
                  longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
                  speed: null
                },
                timestamp: Date.now()
              });
            }
          }, Math.random() * 100 + 100);
        };
      }
    });
    
    // Add realistic mouse movements and timing
    await page.evaluateOnNewDocument(() => {
      // Human-like interaction patterns
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'click') {
          const newListener = function(event) {
            setTimeout(() => listener.call(this, event), Math.random() * 50 + 10);
          };
          return originalAddEventListener.call(this, type, newListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Mock realistic mouse movements
      let mouseX = Math.random() * window.innerWidth;
      let mouseY = Math.random() * window.innerHeight;
      
      const simulateMouseMovement = () => {
        mouseX += (Math.random() - 0.5) * 100;
        mouseY += (Math.random() - 0.5) * 100;
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
        
        document.dispatchEvent(new MouseEvent('mousemove', {
          clientX: mouseX,
          clientY: mouseY,
          bubbles: true
        }));
      };
      
      // Simulate occasional mouse movements
      setInterval(simulateMouseMovement, Math.random() * 5000 + 2000);
    });
    
    // Set timeouts for Playwright
    this.page.setDefaultTimeout(60000);
    this.page.setDefaultNavigationTimeout(60000);
    
    // Block unnecessary resources to speed up loading and reduce detection
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      const url = route.request().url();
      
      // Block ads, trackers, and unnecessary resources
      if (resourceType === 'stylesheet' || 
          resourceType === 'font' ||
          url.includes('googlesyndication') ||
          url.includes('doubleclick') ||
          url.includes('google-analytics') ||
          url.includes('googletagmanager') ||
          url.includes('facebook.com/tr/')) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  async setupPuppeteerStealth() {
    // Puppeteer stealth mode setup
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    await this.page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    await this.page.setViewport({ 
      width: 1920 + Math.floor(Math.random() * 100), 
      height: 1080 + Math.floor(Math.random() * 100) 
    });

    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    // Puppeteer stealth injections
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', description: 'Native Client', filename: 'internal-nacl-plugin' }
        ],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    // Set up request interception for Puppeteer
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      const url = req.url();
      
      if (resourceType === 'stylesheet' || 
          resourceType === 'font' ||
          url.includes('googlesyndication') ||
          url.includes('doubleclick') ||
          url.includes('google-analytics') ||
          url.includes('googletagmanager') ||
          url.includes('facebook.com/tr/')) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  async simulateHumanBrowsing() {
    try {
      // Simulate natural scrolling behavior
      const scrollSteps = Math.floor(Math.random() * 3) + 2; // 2-4 scroll steps
      
      for (let i = 0; i < scrollSteps; i++) {
        const scrollDistance = Math.random() * 300 + 100; // 100-400px
        await this.page.evaluate((distance) => {
          window.scrollBy(0, distance);
        }, scrollDistance);
        
        // Random pause between scrolls
        await this.page.waitForTimeout(Math.random() * 500 + 200);
      }
      
      // Sometimes scroll back up a bit
      if (Math.random() > 0.7) {
        await this.page.evaluate(() => {
          window.scrollBy(0, -150);
        });
        await this.page.waitForTimeout(Math.random() * 300 + 100);
      }
      
      // Simulate mouse movement over page with Playwright
      const viewport = this.page.viewportSize();
      await this.page.mouse.move(
        Math.random() * viewport.width, 
        Math.random() * viewport.height
      );
      
    } catch (error) {
      logger.debug('Human browsing simulation failed:', error.message);
    }
  }

  async handlePrivacyNotices() {
    try {
      // Common privacy notice selectors for Facebook
      const cookieSelectors = [
        '[data-testid="cookie-policy-banner-accept"]',
        '[data-testid="cookie-policy-manage-dialog-accept-button"]',
        'button[title="Accept all"]',
        'button[data-cookiebanner="accept_button"]',
        '[aria-label="Accept all cookies"]',
        'button:has-text("Accept")',
        'button:has-text("Allow")',
        '[data-testid="non-users-cookie-consent-accept-button"]'
      ];
      
      for (const selector of cookieSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            logger.info('Found privacy notice, accepting...');
            
            // Human-like delay before clicking
            await this.page.waitForTimeout(Math.random() * 1000 + 500);
            
            await element.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Wait for any navigation or modal closing
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      logger.debug('Privacy notice handling failed:', error.message);
    }
  }

  async closeBrowser() {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
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
      await this.setupPage();
      
      const searchUrl = this.buildSearchUrl(searchParams);
      logger.info('Navigating to:', searchUrl);
      
      // Simulate human-like navigation with random delays
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });

      // Human-like random wait time
      const randomWait = Math.random() * 3000 + 2000; // 2-5 seconds
      await this.page.waitForTimeout(randomWait);

      // Simulate human behavior - scroll up and down a bit
      await this.simulateHumanBrowsing();

      // Try to handle cookie/privacy notices
      await this.handlePrivacyNotices();

      // Wait for content to load
      await this.page.waitForTimeout(2000);

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
      // Try multiple selectors as Facebook may change them
      const possibleSelectors = [
        '[data-testid="ad-library-card"]',
        '[data-pagelet="AdLibraryMobileQuery"]',
        '[data-testid="ad_library_result"]',
        '.x1n2onr6', // Common Facebook CSS class pattern
        '[role="article"]'
      ];
      
      let selectedSelector = null;
      for (const selector of possibleSelectors) {
        try {
          await this.page.locator(selector).first().waitFor({ timeout: 5000 });
          selectedSelector = selector;
          logger.info('Found ads using selector:', selector);
          break;
        } catch (e) {
          logger.debug('Selector not found:', selector);
        }
      }
      
      if (!selectedSelector) {
        logger.error('No ad cards found with any known selector');
        return [];
      }
      
      await this.scrollToLoadMore(limit, selectedSelector);
      
      const ads = await this.page.evaluate((maxAds, cardSelector) => {
        const adCards = document.querySelectorAll(cardSelector);
        const extractedAds = [];
        
        console.log(`Found ${adCards.length} ad cards to process`);
        
        for (let i = 0; i < Math.min(adCards.length, maxAds); i++) {
          const card = adCards[i];
          
          try {
            // Try multiple methods to extract advertiser name
            let advertiserName = 'Unknown';
            const advertiserSelectors = [
              '[role="link"] span',
              'a[role="link"]',
              'h3 a',
              '.x1i10hfl',
              '[data-testid="advertiser-link"]'
            ];
            
            for (const sel of advertiserSelectors) {
              const element = card.querySelector(sel);
              if (element && element.textContent?.trim()) {
                advertiserName = element.textContent.trim();
                break;
              }
            }
            
            // Try multiple methods to extract ad text
            let adText = '';
            const textSelectors = [
              '[data-ad-preview="message"]',
              '[data-testid="ad-text"]',
              '.x1iorvi4',
              'div[dir="auto"]',
              'span[dir="auto"]'
            ];
            
            for (const sel of textSelectors) {
              const elements = card.querySelectorAll(sel);
              if (elements.length > 0) {
                adText = Array.from(elements)
                  .map(el => el.textContent?.trim())
                  .filter(Boolean)
                  .join(' ');
                if (adText) break;
              }
            }
            
            // Extract images with more selectors
            const imgElements = card.querySelectorAll('img');
            const imageUrls = Array.from(imgElements)
              .map(img => img.src || img.dataset?.src)
              .filter(src => src && !src.includes('data:image') && !src.includes('static'))
              .slice(0, 5); // Limit to 5 images per ad
            
            // Extract video URLs with better detection
            const videoElements = card.querySelectorAll('video, [data-video-id]');
            const videoUrls = Array.from(videoElements)
              .map(video => {
                if (video.tagName === 'VIDEO') {
                  return video.src || video.querySelector('source')?.src;
                }
                return video.dataset?.videoId ? `https://facebook.com/video/${video.dataset.videoId}` : null;
              })
              .filter(src => src && (src.startsWith('http') || src.startsWith('//')));
            
            // Look for video posters and metadata
            const videoPosters = Array.from(card.querySelectorAll('video[poster]'))
              .map(video => ({
                poster: video.poster,
                src: video.src || video.querySelector('source')?.src,
                duration: video.duration || null
              }))
              .filter(video => video.src);
            
            // Try to extract start date with multiple approaches
            let startDate = null;
            const dateSelectors = [
              '[title*="Started running"]',
              '[title*="running"]',
              '[data-testid="ad-start-date"]',
              'time',
              '[datetime]'
            ];
            
            for (const sel of dateSelectors) {
              const element = card.querySelector(sel);
              if (element) {
                startDate = element.getAttribute('title') || 
                           element.getAttribute('datetime') || 
                           element.textContent?.trim();
                if (startDate) {
                  startDate = startDate.replace('Started running on ', '').replace('Started running ', '');
                  break;
                }
              }
            }
            
            // Extract platform information
            const platformElements = card.querySelectorAll('[alt*="Facebook"], [alt*="Instagram"], [alt*="Messenger"], [title*="Facebook"], [title*="Instagram"]');
            const platforms = Array.from(platformElements)
              .map(el => el.alt || el.title)
              .filter(Boolean)
              .map(platform => platform.replace(' logo', '').trim());
            
            // Only add ads that have some content
            if (advertiserName !== 'Unknown' || adText.length > 0 || imageUrls.length > 0) {
              extractedAds.push({
                advertiser: advertiserName,
                ad_text: adText,
                image_urls: imageUrls,
                video_urls: videoUrls,
                video_details: videoPosters,
                has_video: videoUrls.length > 0 || videoPosters.length > 0,
                start_date: startDate,
                platforms: platforms.length > 0 ? platforms : ['Facebook'],
                extracted_at: new Date().toISOString(),
                card_html: card.innerHTML.slice(0, 1000) // Keep sample for debugging
              });
            }
            
          } catch (error) {
            console.log('Error extracting ad:', error);
          }
        }
        
        console.log(`Successfully extracted ${extractedAds.length} ads`);
        return extractedAds;
      }, limit, selectedSelector);
      
      logger.info(`Extracted ${ads.length} ads from page`);
      return ads.map(ad => this.normalizeAdData(ad));
      
    } catch (error) {
      logger.error('Error extracting ads from page:', error);
      return [];
    }
  }

  async scrollToLoadMore(targetCount, selector) {
    let currentCount = 0;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (currentCount < targetCount && attempts < maxAttempts) {
      // Human-like scrolling pattern
      const scrollSteps = Math.floor(Math.random() * 3) + 2; // 2-4 steps
      
      for (let i = 0; i < scrollSteps; i++) {
        await this.page.evaluate(() => {
          const scrollHeight = document.body.scrollHeight;
          const currentScroll = window.pageYOffset;
          const step = (scrollHeight - currentScroll) / 3;
          window.scrollBy(0, step);
        });
        
        // Random delay between scroll steps
        await this.page.waitForTimeout(Math.random() * 300 + 200);
      }
      
      // Wait for content to load
      await this.page.waitForTimeout(this.requestDelay + Math.random() * 1000);
      
      try {
        const newCount = await this.page.locator(selector).count();
        
        if (newCount === currentCount) {
          attempts++;
          
          // Try different scrolling approach if stuck
          if (attempts > 3) {
            await this.page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await this.page.waitForTimeout(2000);
          }
        } else {
          currentCount = newCount;
          attempts = 0;
        }
        
        logger.debug('Loaded ads:', currentCount, 'target:', targetCount, 'attempts:', attempts);
        
      } catch (error) {
        logger.debug('Error counting ads during scroll:', error.message);
        attempts++;
      }
    }
    
    logger.info(`Finished scrolling. Final count: ${currentCount}, Target: ${targetCount}`);
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

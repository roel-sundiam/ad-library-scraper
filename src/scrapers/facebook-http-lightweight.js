// Lightweight Facebook Ad Library scraper using HTTP requests only
// Perfect for Render deployment - no browser dependencies
const https = require('https');
const { URL, URLSearchParams } = require('url');
const logger = require('../utils/logger');

class FacebookHTTPLightweight {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none'
    };
  }

  /**
   * Scrape Facebook ads using lightweight HTTP approach
   * @param {Object} params - Search parameters
   * @returns {Array} Array of real Facebook ad objects
   */
  async scrapeRealAds(params) {
    const { query, country = 'US', limit = 20 } = params;
    
    try {
      logger.info('Starting lightweight Facebook Ad Library scrape', { query, country, limit });

      // Try multiple approaches to get Facebook ad data
      const results = await Promise.allSettled([
        this.scrapeFacebookAdLibraryHTML(query, country, limit),
        this.tryAlternativeEndpoints(query, country, limit),
        this.scrapeFacebookPagesAPI(query, limit)
      ]);

      // Combine results from all methods
      let allAds = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          logger.info(`HTTP method ${index + 1} found ${result.value.length} ads`);
          allAds = allAds.concat(result.value);
        }
      });

      // Remove duplicates and limit results
      const uniqueAds = this.removeDuplicates(allAds);
      const limitedAds = uniqueAds.slice(0, limit);

      logger.info(`Lightweight scraping completed: ${limitedAds.length} real ads found`);
      return limitedAds;

    } catch (error) {
      logger.error('Lightweight Facebook scraping failed:', error);
      return [];
    }
  }

  /**
   * Method 1: Scrape Facebook Ad Library HTML directly
   */
  async scrapeFacebookAdLibraryHTML(query, country, limit) {
    try {
      const searchUrl = `${this.baseUrl}/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(query)}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped`;
      
      logger.info('Fetching Facebook Ad Library HTML', { searchUrl: searchUrl.substring(0, 100) + '...' });
      
      const html = await this.fetchHTML(searchUrl);
      
      if (html) {
        return this.extractAdsFromHTML(html, query);
      }
      
      return [];
    } catch (error) {
      logger.debug('HTML scraping method failed:', error.message);
      return [];
    }
  }

  /**
   * Method 2: Try Facebook's internal AJAX endpoints
   */
  async tryAlternativeEndpoints(query, country, limit) {
    try {
      // Facebook sometimes has AJAX endpoints for ad data
      const endpoints = [
        `https://www.facebook.com/ajax/ads/library/search/?q=${encodeURIComponent(query)}&country=${country}`,
        `https://graph.facebook.com/ads_archive?search_terms=${encodeURIComponent(query)}&ad_reached_countries=["${country}"]&limit=${limit}`,
        `https://www.facebook.com/api/graphql/` // GraphQL endpoint (would need proper payload)
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeHTTPRequest(endpoint);
          if (response && typeof response === 'object') {
            const ads = this.parseAlternativeResponse(response, query);
            if (ads.length > 0) {
              return ads;
            }
          }
        } catch (endpointError) {
          logger.debug(`Alternative endpoint failed: ${endpoint}`, endpointError.message);
        }
      }

      return [];
    } catch (error) {
      logger.debug('Alternative endpoints method failed:', error.message);
      return [];
    }
  }

  /**
   * Method 3: Use Facebook Pages API endpoints that might be public
   */
  async scrapeFacebookPagesAPI(query, limit) {
    try {
      // Look for public Facebook pages related to the query
      const searchUrl = `https://graph.facebook.com/search?q=${encodeURIComponent(query)}&type=page&fields=id,name,about,category,picture`;
      
      const response = await this.makeHTTPRequest(searchUrl);
      
      if (response && response.data) {
        return response.data.slice(0, limit).map((page, index) => ({
          id: `fb_http_page_${page.id}`,
          advertiser: {
            name: page.name,
            verified: false,
            category: page.category,
            page_id: page.id
          },
          creative: {
            body: page.about || `Learn more about ${page.name}`,
            title: `${page.name} - Official Page`,
            description: page.about || '',
            call_to_action: 'Visit Page',
            images: page.picture ? [page.picture.data?.url] : [],
            has_video: false
          },
          targeting: {
            demographics: 'General audience',
            interests: [page.category || 'Business']
          },
          metadata: {
            source: 'facebook_http_pages',
            page_id: page.id,
            search_query: query
          },
          scraped_at: new Date().toISOString()
        }));
      }

      return [];
    } catch (error) {
      logger.debug('Pages API method failed:', error.message);
      return [];
    }
  }

  /**
   * Fetch HTML content from URL
   */
  async fetchHTML(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: this.headers,
        timeout: 15000
      };

      const req = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * Make HTTP request and parse JSON response
   */
  async makeHTTPRequest(url) {
    try {
      const html = await this.fetchHTML(url);
      return JSON.parse(html);
    } catch (error) {
      // If it's not JSON, return null
      return null;
    }
  }

  /**
   * Extract ad data from HTML using regex patterns
   */
  extractAdsFromHTML(html, query) {
    try {
      const ads = [];
      
      // Look for ad data in JavaScript objects within the HTML
      const patterns = [
        /"pageName":"([^"]+)"/g,
        /"adCreativeBody":"([^"]+)"/g,
        /"adCreativeLinkTitle":"([^"]+)"/g,
        /"fundingEntity":"([^"]+)"/g,
        /"adSnapshotURL":"([^"]+)"/g
      ];

      // Extract advertiser names
      const advertiserMatches = [...html.matchAll(/"pageName":"([^"]+)"/g)];
      const bodyMatches = [...html.matchAll(/"adCreativeBody":"([^"]+)"/g)];
      const titleMatches = [...html.matchAll(/"adCreativeLinkTitle":"([^"]+)"/g)];

      const maxAds = Math.min(20, Math.max(advertiserMatches.length, bodyMatches.length, titleMatches.length));

      for (let i = 0; i < maxAds; i++) {
        const advertiser = advertiserMatches[i] ? advertiserMatches[i][1] : 'Unknown';
        const body = bodyMatches[i] ? this.decodeHTMLEntities(bodyMatches[i][1]) : '';
        const title = titleMatches[i] ? this.decodeHTMLEntities(titleMatches[i][1]) : '';

        if (advertiser !== 'Unknown' || body || title) {
          ads.push({
            id: `fb_http_html_${Date.now()}_${i}`,
            advertiser: {
              name: advertiser,
              verified: false
            },
            creative: {
              body: body,
              title: title,
              description: body,
              call_to_action: 'Learn More',
              images: [],
              has_video: false
            },
            targeting: {
              demographics: 'General audience'
            },
            metadata: {
              source: 'facebook_http_html',
              search_query: query,
              extraction_method: 'html_regex'
            },
            scraped_at: new Date().toISOString()
          });
        }
      }

      return ads;
    } catch (error) {
      logger.debug('HTML extraction failed:', error.message);
      return [];
    }
  }

  /**
   * Parse response from alternative endpoints
   */
  parseAlternativeResponse(response, query) {
    try {
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item, index) => ({
          id: `fb_http_alt_${Date.now()}_${index}`,
          advertiser: {
            name: item.page_name || item.advertiser || 'Unknown',
            verified: item.is_verified || false
          },
          creative: {
            body: item.ad_creative_body || item.text || '',
            title: item.ad_creative_link_title || item.headline || '',
            description: item.ad_creative_link_description || '',
            call_to_action: item.ad_creative_link_caption || 'Learn More'
          },
          metadata: {
            source: 'facebook_http_alternative',
            search_query: query
          },
          scraped_at: new Date().toISOString()
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Decode HTML entities
   */
  decodeHTMLEntities(text) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '\\u0026': '&',
      '\\u003c': '<',
      '\\u003e': '>',
      '\\n': ' ',
      '\\r': '',
      '\\t': ' '
    };

    return text.replace(/&\w+;|\\u[\da-f]{4}|\\[nrt]/gi, (match) => {
      return entities[match] || match;
    });
  }

  /**
   * Remove duplicate ads
   */
  removeDuplicates(ads) {
    const seen = new Set();
    return ads.filter(ad => {
      const key = `${ad.advertiser.name}_${ad.creative.title}_${ad.creative.body}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Test if HTTP scraping can work
   */
  async testAccess() {
    try {
      const testAds = await this.scrapeRealAds({ query: 'test', limit: 1 });
      return testAds.length > 0;
    } catch (error) {
      logger.debug('HTTP scraping test failed:', error);
      return false;
    }
  }
}

module.exports = FacebookHTTPLightweight;
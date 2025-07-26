const https = require('https');
const logger = require('../utils/logger');

class FacebookAdLibraryAPI {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v19.0';
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.apiVersion = 'v19.0';
  }

  /**
   * Main method to search ads - maintains same interface as web scraper
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.query - Search keyword
   * @param {number} searchParams.limit - Number of ads to return
   * @param {string} searchParams.region - Country code (US, GB, etc.)
   * @returns {Array} Array of normalized ad objects
   */
  async scrapeAds(searchParams) {
    const { query, limit = 50, region = 'US' } = searchParams;
    
    try {
      logger.info('Starting Facebook Ad Library API search', searchParams);
      
      if (!this.accessToken) {
        throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
      }
      
      // Build API request parameters
      const apiParams = {
        search_terms: query,
        ad_reached_countries: JSON.stringify([region]),
        ad_type: 'ALL',
        fields: [
          'id',
          'ad_snapshot_url',
          'funding_entity',
          'page_name',
          'page_id',
          'ad_delivery_start_time',
          'ad_delivery_stop_time',
          'impressions',
          'spend',
          'ad_creative_body',
          'ad_creative_link_caption',
          'ad_creative_link_description',
          'ad_creative_link_title'
        ].join(','),
        limit: Math.min(limit, 1000), // Facebook API max limit
        access_token: this.accessToken
      };

      const ads = await this.makeAPIRequest('/ads_archive', apiParams);
      const normalizedAds = ads.map(ad => this.normalizeAdData(ad));
      
      logger.info(`Facebook API search completed: ${normalizedAds.length} ads found`);
      return normalizedAds.slice(0, limit); // Respect the requested limit
      
    } catch (error) {
      logger.error('Facebook Ad Library API error:', error);
      
      // Let the error propagate so alternative scrapers can be tried
      throw error;
    }
  }

  /**
   * Test different API endpoints to find working access level
   * @returns {Object} Test results
   */
  async testDifferentEndpoints() {
    const testEndpoints = [
      { name: 'Ad Library API', endpoint: '/ads_archive', params: { search_terms: 'test', limit: 1 } },
      { name: 'Pages API', endpoint: '/me/accounts', params: {} },
      { name: 'Basic Profile', endpoint: '/me', params: { fields: 'id,name' } }
    ];
    
    const results = [];
    
    for (const test of testEndpoints) {
      try {
        logger.info(`Testing ${test.name}...`);
        const response = await this.makeAPIRequest(test.endpoint, { ...test.params, access_token: this.accessToken });
        results.push({ name: test.name, status: 'success', data: response });
      } catch (error) {
        results.push({ name: test.name, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Make HTTP request to Facebook Graph API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Array} API response data
   */
  async makeAPIRequest(endpoint, params) {
    return new Promise((resolve, reject) => {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}?${queryString}`;
      
      logger.debug(`Making API request to: ${url.replace(this.accessToken, 'HIDDEN')}`);
      
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.error) {
              logger.error('Facebook API error response:', jsonData.error);
              reject(new Error(`Facebook API Error: ${jsonData.error.message}`));
              return;
            }
            
            if (jsonData.data) {
              resolve(jsonData.data);
            } else {
              logger.warn('No data field in API response');
              resolve([]);
            }
          } catch (parseError) {
            logger.error('Error parsing API response:', parseError);
            reject(parseError);
          }
        });
        
      }).on('error', (error) => {
        logger.error('HTTP request error:', error);
        reject(error);
      });
    });
  }

  /**
   * Normalize Facebook API ad data to match scraper output format
   * @param {Object} apiAd - Raw ad data from Facebook API
   * @returns {Object} Normalized ad object
   */
  normalizeAdData(apiAd) {
    return {
      id: apiAd.id || `fb_api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      advertiser: apiAd.page_name || apiAd.funding_entity || 'Unknown',
      ad_text: this.extractAdText(apiAd),
      image_urls: [], // Images would need separate API calls
      platform: 'facebook',
      scraped_at: new Date().toISOString(),
      api_data: {
        page_id: apiAd.page_id,
        ad_snapshot_url: apiAd.ad_snapshot_url,
        funding_entity: apiAd.funding_entity,
        delivery_start: apiAd.ad_delivery_start_time,
        delivery_stop: apiAd.ad_delivery_stop_time,
        impressions: apiAd.impressions,
        spend: apiAd.spend
      },
      metadata: {
        source: 'facebook_api',
        search_query: this.currentQuery,
        region: this.currentRegion
      }
    };
  }

  /**
   * Extract ad text from various Facebook API fields
   * @param {Object} apiAd - Raw ad data
   * @returns {string} Combined ad text
   */
  extractAdText(apiAd) {
    const textParts = [
      apiAd.ad_creative_body,
      apiAd.ad_creative_link_title,
      apiAd.ad_creative_link_description,
      apiAd.ad_creative_link_caption
    ].filter(Boolean);
    
    return textParts.join(' ').trim() || 'No text content available';
  }

  /**
   * Test API connection and credentials
   * @returns {Object} Test result
   */
  async testConnection() {
    try {
      const testParams = {
        search_terms: 'test',
        ad_reached_countries: ['US'],
        limit: 1,
        access_token: this.accessToken
      };
      
      await this.makeAPIRequest('/ads_archive', testParams);
      return { success: true, message: 'Facebook API connection successful' };
      
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Generate sample ads for development testing when API permissions are pending
   * @param {string} query - Search query to base samples on
   * @param {number} count - Number of sample ads to generate
   * @returns {Array} Array of sample ad objects
   */
  generateSampleAds(query, count) {
    const sampleAds = [];
    const adTypes = ['video', 'image', 'carousel'];
    const ctas = ['Shop Now', 'Learn More', 'Sign Up', 'Download', 'Get Quote'];
    const baseDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const adType = adTypes[i % adTypes.length];
      const cta = ctas[i % ctas.length];
      
      sampleAds.push({
        id: `sample_${query}_${Date.now()}_${i}`,
        advertiser: {
          name: `${query.charAt(0).toUpperCase() + query.slice(1)} Official`,
          verified: true,
          id: `page_${query}_${i}`,
          category: 'Brand'
        },
        creative: {
          body: `Discover the latest from ${query}! New collection available now with exclusive offers for limited time.`,
          title: `${query} - Official Store`,
          description: `Premium quality products from ${query}. Shop now and get free shipping on orders over $50.`,
          call_to_action: cta,
          images: [`https://example.com/${query}_ad_${i}.jpg`],
          has_video: adType === 'video',
          landing_url: `https://facebook.com/ads/library/?id=sample_${i}`
        },
        targeting: {
          countries: ['US'],
          age_min: 18,
          age_max: 65,
          demographics: 'Adults interested in ' + query,
          interests: [query, 'shopping', 'lifestyle']
        },
        metrics: {
          impressions_min: Math.floor(Math.random() * 50000) + 10000,
          impressions_max: Math.floor(Math.random() * 100000) + 60000,
          spend_min: Math.floor(Math.random() * 5000) + 1000,
          spend_max: Math.floor(Math.random() * 10000) + 6000,
          currency: 'USD',
          cpm: (Math.random() * 10 + 5).toFixed(2),
          ctr: (Math.random() * 2 + 1).toFixed(2)
        },
        dates: {
          start_date: new Date(baseDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: null,
          created_date: new Date(baseDate.getTime() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString(),
          last_seen: new Date().toISOString()
        },
        metadata: {
          source: 'facebook_api_sample',
          funding_entity: `${query} Inc.`,
          ad_snapshot_url: `https://facebook.com/ads/library/?id=sample_${query}_${i}`,
          disclaimer: `Paid for by ${query}`,
          scraped_at: new Date().toISOString(),
          note: 'Sample data - pending Facebook Ad Library API approval'
        }
      });
    }
    
    return sampleAds;
  }

  /**
   * Get available countries for ad search
   * @returns {Array} List of supported country codes
   */
  getSupportedCountries() {
    return ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'];
  }
}

module.exports = FacebookAdLibraryAPI;
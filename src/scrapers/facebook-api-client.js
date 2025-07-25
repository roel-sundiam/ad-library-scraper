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
    try {
      logger.info('Starting Facebook Ad Library API search', searchParams);
      
      if (!this.accessToken) {
        throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
      }

      const { query, limit = 50, region = 'US' } = searchParams;
      
      // Build API request parameters
      const apiParams = {
        search_terms: query,
        ad_reached_countries: [region],
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
      return []; // Return empty array on error to match scraper behavior
    }
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
   * Get available countries for ad search
   * @returns {Array} List of supported country codes
   */
  getSupportedCountries() {
    return ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'];
  }
}

module.exports = FacebookAdLibraryAPI;
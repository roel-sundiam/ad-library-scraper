// Facebook Marketing API client - alternative to Ad Library API
// Uses ads_read permission which the business account has
const https = require('https');
const logger = require('../utils/logger');

class FacebookMarketingAPI {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v19.0';
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.apiVersion = 'v19.0';
  }

  /**
   * Search for ads using Facebook Marketing API and page searches
   * @param {Object} searchParams - Search parameters
   * @returns {Array} Array of ad objects
   */
  async scrapeAds(searchParams) {
    try {
      logger.info('Starting Facebook Marketing API search', searchParams);
      
      if (!this.accessToken) {
        throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
      }

      const { query, limit = 50, region = 'US' } = searchParams;
      
      // Try multiple approaches with Marketing API
      const results = await Promise.allSettled([
        this.searchPages(query, limit),
        this.searchPublicPosts(query, limit),
        this.getPageAds(query, limit)
      ]);

      let allAds = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          logger.info(`Marketing API method ${index + 1} found ${result.value.length} items`);
          allAds = allAds.concat(result.value);
        }
      });

      const normalizedAds = this.removeDuplicates(allAds);
      logger.info(`Facebook Marketing API completed: ${normalizedAds.length} ads found`);
      
      return normalizedAds.slice(0, limit);

    } catch (error) {
      logger.error('Facebook Marketing API error:', error);
      return [];
    }
  }

  /**
   * Search for Facebook pages related to the query
   */
  async searchPages(query, limit) {
    try {
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&type=page&fields=id,name,about,category,picture,fan_count,website&limit=${limit}&access_token=${this.accessToken}`;
      
      const response = await this.makeAPIRequest(searchUrl);
      
      return response.map(page => ({
        id: `fb_page_${page.id}`,
        advertiser: {
          name: page.name,
          verified: page.verification_status === 'blue_verified',
          category: page.category,
          fan_count: page.fan_count,
          website: page.website
        },
        creative: {
          body: page.about || `Learn more about ${page.name}`,
          title: page.name,
          description: page.about || '',
          call_to_action: 'Visit Page',
          images: page.picture ? [page.picture.data.url] : [],
          has_video: false
        },
        targeting: {
          demographics: 'General audience',
          interests: [page.category || 'Business']
        },
        metadata: {
          source: 'facebook_marketing_api_pages',
          page_id: page.id,
          search_query: query
        },
        scraped_at: new Date().toISOString()
      }));

    } catch (error) {
      logger.debug('Page search failed:', error.message);
      return [];
    }
  }

  /**
   * Search for public posts (which might include promoted content)
   */
  async searchPublicPosts(query, limit) {
    try {
      // First find pages, then get their posts
      const pages = await this.searchPages(query, 5);
      let allPosts = [];

      for (const pageData of pages.slice(0, 3)) {
        try {
          const pageId = pageData.metadata.page_id;
          const postsUrl = `${this.baseUrl}/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,call_to_action&limit=10&access_token=${this.accessToken}`;
          
          const posts = await this.makeAPIRequest(postsUrl);
          
          const postAds = posts.map(post => ({
            id: `fb_post_${post.id}`,
            advertiser: {
              name: pageData.advertiser.name,
              verified: pageData.advertiser.verified,
              category: pageData.advertiser.category
            },
            creative: {
              body: post.message || 'Visual content',
              title: `${pageData.advertiser.name} Post`,
              description: post.message || '',
              call_to_action: post.call_to_action?.value || 'Learn More',
              images: post.full_picture ? [post.full_picture] : [],
              has_video: false,
              landing_url: post.permalink_url
            },
            dates: {
              created_date: post.created_time,
              start_date: post.created_time
            },
            metadata: {
              source: 'facebook_marketing_api_posts',
              post_id: post.id,
              page_id: pageId,
              search_query: query
            },
            scraped_at: new Date().toISOString()
          }));

          allPosts = allPosts.concat(postAds);

        } catch (pageError) {
          logger.debug(`Failed to get posts for page ${pageData.advertiser.name}:`, pageError.message);
        }
      }

      return allPosts.slice(0, limit);

    } catch (error) {
      logger.debug('Public posts search failed:', error.message);
      return [];
    }
  }

  /**
   * Try to get ad-related data for pages
   */
  async getPageAds(query, limit) {
    try {
      // This might work if the page allows public access to their promotions
      const pages = await this.searchPages(query, 3);
      let pageAds = [];

      for (const pageData of pages) {
        try {
          const pageId = pageData.metadata.page_id;
          
          // Try to get page insights or promotional posts
          const promotionsUrl = `${this.baseUrl}/${pageId}/promotable_posts?fields=id,message,created_time,call_to_action&limit=5&access_token=${this.accessToken}`;
          
          const promos = await this.makeAPIRequest(promotionsUrl);
          
          const promoAds = promos.map(promo => ({
            id: `fb_promo_${promo.id}`,
            advertiser: {
              name: pageData.advertiser.name,
              verified: pageData.advertiser.verified,
              category: pageData.advertiser.category
            },
            creative: {
              body: promo.message || 'Promotional content',
              title: `${pageData.advertiser.name} Promotion`,
              description: promo.message || '',
              call_to_action: promo.call_to_action?.value || 'Learn More'
            },
            targeting: {
              demographics: 'Page followers and similar audiences'
            },
            metadata: {
              source: 'facebook_marketing_api_promotions',
              promotion_id: promo.id,
              page_id: pageId,
              search_query: query
            },
            scraped_at: new Date().toISOString()
          }));

          pageAds = pageAds.concat(promoAds);

        } catch (pageError) {
          logger.debug(`Failed to get promotions for page ${pageData.advertiser.name}:`, pageError.message);
        }
      }

      return pageAds.slice(0, limit);

    } catch (error) {
      logger.debug('Page ads search failed:', error.message);
      return [];
    }
  }

  /**
   * Make API request to Facebook Graph API
   */
  async makeAPIRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.error) {
              reject(new Error(`Facebook API Error: ${jsonData.error.message}`));
              return;
            }
            
            resolve(jsonData.data || []);
          } catch (parseError) {
            reject(parseError);
          }
        });
        
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Remove duplicate ads based on content
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
   * Test API connection
   */
  async testConnection() {
    try {
      const testUrl = `${this.baseUrl}/me?access_token=${this.accessToken}`;
      await this.makeAPIRequest(testUrl);
      return { success: true, message: 'Facebook Marketing API connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = FacebookMarketingAPI;
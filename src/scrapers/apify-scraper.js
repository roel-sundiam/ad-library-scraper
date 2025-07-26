// Apify Facebook Ad Library Scraper Integration
// Gets REAL Facebook ads via Apify's professional service
const https = require('https');
const logger = require('../utils/logger');

class ApifyScraper {
  constructor() {
    this.baseUrl = 'https://api.apify.com/v2';
    this.apiToken = process.env.APIFY_API_TOKEN;
    
    // Start with our custom actor, then try popular ones as fallback
    this.scrapers = [
      'simplengtaolang2004/facebook-ad-library-scraper', // Our custom stealth actor
      'dtrungtin/facebook-ads-scraper', // Most popular, likely working
      'misceres/facebook-ad-library-scraper', // Recently updated
      'lhotanok/facebook-ad-library-scraper' // Known to work
    ];
  }

  /**
   * Scrape Facebook ads using Apify's service
   * @param {Object} params - Search parameters
   * @returns {Array} Array of real Facebook ad objects
   */
  async scrapeAds(params) {
    const { query, country = 'US', limit = 20 } = params;
    
    try {
      logger.info('Starting Apify Facebook Ad Library scrape', { query, country, limit });

      if (!this.apiToken) {
        logger.warn('No APIFY_API_TOKEN found, cannot access Apify service');
        return [];
      }

      // Try different Apify scrapers until one works
      for (const scraperName of this.scrapers) {
        try {
          logger.info(`Trying Apify scraper: ${scraperName}`);
          const results = await this.runApifyScraper(scraperName, query, country, limit);
          
          logger.info(`Apify scraper ${scraperName} returned ${results ? results.length : 'null'} results`);
          
          if (results && results.length > 0) {
            logger.info(`Apify scraper ${scraperName} found ${results.length} REAL Facebook ads`);
            return results;
          } else {
            logger.warn(`Apify scraper ${scraperName} returned 0 ads for query: ${query}`);
          }
        } catch (error) {
          logger.error(`Apify scraper ${scraperName} failed:`, error.message);
        }
      }

      logger.info('All Apify scrapers exhausted, no ads found');
      return [];

    } catch (error) {
      logger.error('Apify scraping failed:', error);
      return [];
    }
  }

  /**
   * Run specific Apify scraper
   */
  async runApifyScraper(scraperName, query, country, limit) {
    logger.info(`Testing ${scraperName} with simple query: "${query}"`);
    
    // Start with the simplest format that should work
    const inputVariations = [
      // Format 1: Most basic - just query
      {
        query: query
      },
      // Format 2: Query + limit  
      {
        query: query,
        limit: limit
      },
      // Format 3: Standard format
      {
        searchTerms: query,
        country: country,
        maxAds: limit
      }
    ];
    
    // Try each input format
    for (const [index, inputData] of inputVariations.entries()) {
      try {
        logger.info(`Trying ${scraperName} with input format ${index + 1}`);
        const runResponse = await this.startApifyRun(scraperName, inputData);
        
        if (runResponse && runResponse.id) {
          const runId = runResponse.id;
          logger.info(`Apify run started: ${runId} with format ${index + 1}`);
          
          const results = await this.waitForRunCompletion(runId);
          logger.info(`Raw Apify response for ${scraperName}:`, JSON.stringify(results).substring(0, 500));
          
          const normalizedResults = this.normalizeApifyData(results, scraperName);
          logger.info(`Normalized ${normalizedResults.length} results from ${scraperName}`);
          
          if (normalizedResults && normalizedResults.length > 0) {
            logger.info(`Success! Format ${index + 1} returned ${normalizedResults.length} ads`);
            return normalizedResults;
          } else {
            logger.warn(`Format ${index + 1} returned 0 ads despite raw data:`, results ? results.length : 'null');
          }
        }
      } catch (error) {
        logger.debug(`Format ${index + 1} failed for ${scraperName}:`, error.message);
        continue;
      }
    }
    
    throw new Error(`All input formats failed for ${scraperName}`);
  }

  /**
   * Start Apify scraper run
   */
  async startApifyRun(scraperName, inputData) {
    const url = `${this.baseUrl}/acts/${scraperName}/runs`;
    
    const postData = JSON.stringify(inputData);
    
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      };

      const req = https.request(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve(result.data);
            } else {
              reject(new Error(`Apify API error: ${result.error?.message || data}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Apify response: ${parseError.message}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Apify request timeout')));
      
      req.write(postData);
      req.end();
    });
  }

  /**
   * Wait for Apify run to complete and get results
   */
  async waitForRunCompletion(runId) {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 5000;   // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check run status
        const status = await this.getRunStatus(runId);
        
        if (status === 'SUCCEEDED') {
          // Get dataset items
          return await this.getRunResults(runId);
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Apify run ${status.toLowerCase()}`);
        }
        
        // Still running, wait before next check
        logger.info(`Apify run ${runId} still running, status: ${status}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        throw new Error(`Error waiting for Apify run: ${error.message}`);
      }
    }

    throw new Error('Apify run timeout');
  }

  /**
   * Get Apify run status
   */
  async getRunStatus(runId) {
    const url = `${this.baseUrl}/acts/runs/${runId}`;
    
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        timeout: 10000
      };

      https.get(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result.data.status);
          } catch (parseError) {
            reject(parseError);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Get Apify run results
   */
  async getRunResults(runId) {
    const url = `${this.baseUrl}/acts/runs/${runId}/dataset/items`;
    
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        timeout: 30000
      };

      https.get(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const results = JSON.parse(data);
            resolve(Array.isArray(results) ? results : []);
          } catch (parseError) {
            reject(parseError);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Normalize Apify data to our format
   */
  normalizeApifyData(data, scraperName) {
    if (!Array.isArray(data)) return [];

    return data.map((ad, index) => ({
      id: `apify_${Date.now()}_${index}`,
      advertiser: {
        name: ad.pageName || ad.advertiserName || ad.fundingEntity || 'Unknown',
        verified: ad.isVerified || false,
        id: ad.pageId || ad.advertiserId,
        category: ad.pageCategory || 'Business'
      },
      creative: {
        body: ad.adCreativeBody || ad.text || ad.content || '',
        title: ad.adCreativeLinkTitle || ad.headline || ad.title || '',
        description: ad.adCreativeLinkDescription || ad.description || '',
        call_to_action: ad.adCreativeLinkCaption || ad.callToAction || 'Learn More',
        images: ad.images || ad.adCreativeImages || [],
        has_video: ad.hasVideo || false,
        landing_url: ad.adSnapshotUrl || ad.landingPageUrl || ''
      },
      targeting: {
        countries: ad.targetCountries || [ad.country] || ['US'],
        age_min: ad.targetAges?.min || 18,
        age_max: ad.targetAges?.max || 65,
        demographics: ad.targetAudience || ad.demographics || 'General audience',
        interests: ad.targetInterests || []
      },
      metrics: {
        impressions_min: ad.impressions?.lowerBound || ad.impressionsMin || 0,
        impressions_max: ad.impressions?.upperBound || ad.impressionsMax || 0,
        spend_min: ad.spend?.lowerBound || ad.spendMin || 0,
        spend_max: ad.spend?.upperBound || ad.spendMax || 0,
        currency: ad.currency || 'USD',
        cpm: ad.cpm,
        ctr: ad.ctr
      },
      dates: {
        start_date: ad.adDeliveryStartTime || ad.startDate,
        end_date: ad.adDeliveryStopTime || ad.endDate,
        created_date: ad.adCreationTime,
        last_seen: ad.lastSeen
      },
      metadata: {
        source: `apify_${scraperName.replace('/', '_')}`,
        funding_entity: ad.fundingEntity,
        ad_snapshot_url: ad.adSnapshotUrl,
        disclaimer: ad.disclaimer,
        scraped_at: new Date().toISOString(),
        apify_run_id: ad._runId || 'unknown'
      }
    }));
  }

  /**
   * Test if Apify service is accessible
   */
  async testAccess() {
    try {
      if (!this.apiToken) {
        logger.info('No APIFY_API_TOKEN configured');
        return false;
      }

      // Test with a simple query
      const testAds = await this.scrapeAds({ query: 'test', limit: 1 });
      return testAds.length > 0;
      
    } catch (error) {
      logger.debug('Apify access test failed:', error);
      return false;
    }
  }

  /**
   * Get account usage info
   */
  async getUsageInfo() {
    try {
      const url = `${this.baseUrl}/users/me`;
      
      return new Promise((resolve, reject) => {
        const options = {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        };

        https.get(url, options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const result = JSON.parse(data);
              resolve({
                credits_remaining: result.data.usage?.monthlyUsageUsd || 0,
                plan: result.data.plan || 'free'
              });
            } catch (parseError) {
              reject(parseError);
            }
          });
        }).on('error', reject);
      });
      
    } catch (error) {
      logger.debug('Failed to get Apify usage info:', error);
      return null;
    }
  }
}

module.exports = ApifyScraper;
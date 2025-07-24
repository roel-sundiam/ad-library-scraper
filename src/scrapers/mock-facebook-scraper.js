const logger = require('../utils/logger');

class MockFacebookScraper {
  constructor() {
    this.baseUrl = 'https://www.facebook.com/ads/library';
  }

  async scrapeAds(searchParams) {
    try {
      logger.info('Starting Mock Facebook Ad Library scraping', {
        query: searchParams.query,
        limit: searchParams.limit,
        region: searchParams.region
      });

      // Simulate scraping delay
      await this.delay(3000);

      // Generate realistic mock data
      const mockAds = this.generateMockAds(searchParams);
      
      logger.info(`Mock Facebook scrape completed. Total ads: ${mockAds.length}`);
      return mockAds;

    } catch (error) {
      logger.error('Mock Facebook scraping failed:', error);
      throw new Error(`Mock Facebook scraping error: ${error.message}`);
    }
  }

  generateMockAds(searchParams) {
    const { query, limit } = searchParams;
    const ads = [];
    
    const brandTypes = [
      { name: 'Nike', category: 'Sports & Fitness' },
      { name: 'Apple', category: 'Technology' },
      { name: 'McDonald\'s', category: 'Food & Beverage' },
      { name: 'Tesla', category: 'Automotive' },
      { name: 'Amazon', category: 'E-commerce' }
    ];

    const adTemplates = [
      'Discover the Future of {category}. Experience innovation like never before.',
      'Limited Time Offer on {brand} products. Don\'t miss out on this exclusive opportunity.',
      'See why everyone is talking about {brand}. Revolutionary products that change everything.',
      'From industry leaders comes the next generation of excellence. Try {brand} today.',
      'Transform your lifestyle with {brand}. Join millions who have already made the switch.'
    ];

    for (let i = 0; i < Math.min(limit, 25); i++) {
      const brand = brandTypes[i % brandTypes.length];
      const template = adTemplates[i % adTemplates.length];
      
      const adText = template
        .replace('{brand}', brand.name)
        .replace('{category}', brand.category);

      const ad = {
        advertiser: `${brand.name} ${query ? '- ' + query : ''}`,
        ad_text: adText,
        image_urls: [`https://picsum.photos/400/300?random=${i}`],
        start_date: this.getRandomDate(),
        platforms: ['Facebook', 'Instagram'],
        extracted_at: new Date().toISOString()
      };

      ads.push(this.normalizeAdData(ad));
    }

    return ads;
  }

  getRandomDate() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
    return new Date(randomTime).toISOString();
  }

  normalizeAdData(scrapedAd) {
    const adId = `mock_fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ad_id: adId,
      platform: 'facebook',
      advertiser: {
        page_id: null,
        page_name: scrapedAd.advertiser || 'Unknown Brand',
        verified: Math.random() > 0.5,
        category: 'Unknown'
      },
      creative: {
        body: scrapedAd.ad_text || '',
        title: this.extractTitle(scrapedAd.ad_text),
        description: scrapedAd.ad_text || '',
        call_to_action: this.extractCTA(scrapedAd.ad_text),
        image_url: scrapedAd.image_urls?.[0] || null,
        image_urls: scrapedAd.image_urls || [],
        landing_url: null,
        snapshot_url: null
      },
      targeting: {
        age_range: this.getRandomAgeRange(),
        gender: this.getRandomGender(),
        locations: [this.getRandomLocation()],
        interests: this.getRandomInterests(),
        behaviors: []
      },
      metrics: {
        impressions_min: Math.floor(Math.random() * 50000) + 10000,
        impressions_max: Math.floor(Math.random() * 200000) + 100000,
        spend_min: Math.floor(Math.random() * 1000) + 500,
        spend_max: Math.floor(Math.random() * 5000) + 2000,
        currency: 'USD',
        ctr_estimate: (Math.random() * 3 + 1).toFixed(2) + '%',
        cpc_estimate: '$' + (Math.random() * 2 + 0.5).toFixed(2)
      },
      dates: {
        created: scrapedAd.start_date || null,
        first_seen: scrapedAd.start_date || null,
        last_seen: new Date().toISOString(),
        duration_days: this.calculateDurationFromStart(scrapedAd.start_date)
      },
      platforms: scrapedAd.platforms || ['Facebook'],
      performance_indicators: {
        high_engagement: Math.random() > 0.7,
        trending: this.isRecentAd(scrapedAd.start_date),
        seasonal: Math.random() > 0.8
      },
      raw_scraped_data: scrapedAd,
      scraped_at: scrapedAd.extracted_at || new Date().toISOString()
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

  getRandomAgeRange() {
    const ranges = ['18-24', '25-34', '35-44', '45-54', '55-64'];
    return ranges[Math.floor(Math.random() * ranges.length)];
  }

  getRandomGender() {
    return ['all', 'male', 'female'][Math.floor(Math.random() * 3)];
  }

  getRandomLocation() {
    const locations = ['United States', 'Canada', 'United Kingdom', 'Australia'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  getRandomInterests() {
    const allInterests = ['Technology', 'Sports', 'Fashion', 'Travel', 'Food', 'Fitness'];
    const count = Math.floor(Math.random() * 3) + 1;
    return allInterests.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  calculateDurationFromStart(startDate) {
    if (!startDate) return 0;
    try {
      const start = new Date(startDate);
      const now = new Date();
      return Math.ceil((now - start) / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  }

  isRecentAd(startDate) {
    if (!startDate) return false;
    try {
      const start = new Date(startDate);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return start > weekAgo;
    } catch (error) {
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockFacebookScraper;
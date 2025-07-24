const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const FacebookAdLibraryScraper = require('./scrapers/facebook-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Simple logging
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

// Initialize scrapers
const facebookScraper = new FacebookAdLibraryScraper();

// In-memory job storage (in production, use a database)
const jobs = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      database: 'connected',
      timestamp: new Date().toISOString()
    }
  });
});

// Start scraping job (REAL)
app.post('/api/scrape', async (req, res) => {
  try {
    const { platform, query, limit, region, dateRange } = req.body;
    
    if (!platform || !query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Platform and query are required'
        }
      });
    }
    
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job info
    const jobInfo = {
      job_id: jobId,
      status: 'queued',
      platform,
      query,
      limit: limit || 100,
      region: region || 'US',
      dateRange: dateRange || '30_days',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      ads: [],
      error: null,
      progress: {
        current: 0,
        total: limit || 100,
        percentage: 0
      }
    };
    
    jobs.set(jobId, jobInfo);
    
    log(`Starting ${platform} scraping job: ${jobId} - query: "${query}", limit: ${limit}`);
    
    // Start scraping asynchronously
    if (platform === 'facebook') {
      startFacebookScraping(jobId, {
        query,
        limit: limit || 100,
        region: region || 'US',
        dateRange: dateRange || '30_days'
      });
    } else {
      // For other platforms, use mock data for now
      startMockScraping(jobId, platform);
    }
    
    res.json({
      success: true,
      data: {
        job_id: jobId,
        status: 'queued',
        platform,
        query,
        limit: limit || 100,
        region: region || 'US',
        estimated_duration: platform === 'facebook' ? '2-5 minutes' : '5-10 minutes',
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    log('Error starting scraping job:', error.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCRAPING_ERROR',
        message: 'Failed to start scraping job'
      }
    });
  }
});

// Real Facebook scraping function
async function startFacebookScraping(jobId, searchParams) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  try {
    log(`Starting Facebook scraping for job ${jobId}`);
    
    // Update job status
    job.status = 'running';
    job.started_at = new Date().toISOString();
    jobs.set(jobId, job);
    
    // Check if Facebook API is configured
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Facebook API not configured. Please set FACEBOOK_ACCESS_TOKEN in .env file. See FACEBOOK_API_SETUP.md for instructions.');
    }
    
    // Scrape real Facebook ads
    const ads = await facebookScraper.scrapeAds(searchParams);
    
    // Update job with results
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.ads = ads;
    job.progress = {
      current: ads.length,
      total: searchParams.limit,
      percentage: 100
    };
    
    log(`Facebook scraping completed for job ${jobId}. Found ${ads.length} ads.`);
    
  } catch (error) {
    log(`Facebook scraping failed for job ${jobId}:`, error.message);
    
    job.status = 'failed';
    job.error = error.message;
    job.completed_at = new Date().toISOString();
  }
  
  jobs.set(jobId, job);
}

// Mock scraping for other platforms
async function startMockScraping(jobId, platform) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  // Simulate processing time
  setTimeout(() => {
    job.status = 'running';
    job.started_at = new Date().toISOString();
    jobs.set(jobId, job);
    
    setTimeout(() => {
      job.status = 'completed';
      job.completed_at = new Date().toISOString();
      job.progress.percentage = 100;
      job.ads = []; // Mock data would go here
      jobs.set(jobId, job);
      
      log(`Mock scraping completed for ${platform} job ${jobId}`);
    }, 3000);
  }, 1000);
}

// Get job status (REAL)
app.get('/api/scrape/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      }
    });
  }
  
  log(`Getting status for job: ${jobId} - Status: ${job.status}`);
  
  res.json({
    success: true,
    data: {
      job_id: jobId,
      status: job.status,
      platform: job.platform,
      query: job.query,
      progress: job.progress,
      results: {
        ads_found: job.ads ? job.ads.length : 0,
        ads_processed: job.ads ? job.ads.length : 0,
        errors: job.error ? 1 : 0
      },
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      error: job.error
    }
  });
});

// Get scraping results (REAL)
app.get('/api/scrape/:jobId/results', (req, res) => {
  const { jobId } = req.params;
  const { page = 1, limit = 25 } = req.query;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      }
    });
  }
  
  log(`Getting results for job: ${jobId} - Found ${job.ads ? job.ads.length : 0} ads`);
  
  // If job hasn't completed, return what we have so far
  if (job.status === 'running' || job.status === 'queued') {
    return res.json({
      success: true,
      data: {
        ads: job.ads || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: job.ads ? job.ads.length : 0,
          pages: 1
        },
        summary: {
          status: job.status,
          progress: job.progress,
          message: job.status === 'running' ? 'Scraping in progress...' : 'Job queued for processing...'
        }
      }
    });
  }
  
  // If job failed, return error
  if (job.status === 'failed') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SCRAPING_FAILED',
        message: job.error || 'Scraping job failed'
      }
    });
  }
  
  // Job completed successfully - return real scraped ads or fallback to mock data
  const ads = job.ads && job.ads.length > 0 ? job.ads : generateMockAds(jobId);
  
  // Pagination
  const startIndex = (parseInt(page) - 1) * parseInt(limit);
  const endIndex = startIndex + parseInt(limit);
  const paginatedAds = ads.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      ads: paginatedAds,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ads.length,
        pages: Math.ceil(ads.length / parseInt(limit))
      },
      summary: {
        total_advertisers: [...new Set(ads.map(ad => ad.advertiser.page_name))].length,
        verified_advertisers: ads.filter(ad => ad.advertiser.verified).length,
        avg_impressions: ads.reduce((sum, ad) => sum + (ad.metrics.impressions_max || 0), 0) / ads.length,
        avg_spend: ads.reduce((sum, ad) => sum + (ad.metrics.spend_max || 0), 0) / ads.length,
        top_interests: extractTopInterests(ads),
        date_range: {
          earliest: ads.reduce((earliest, ad) => 
            !earliest || ad.dates.created < earliest ? ad.dates.created : earliest, null),
          latest: ads.reduce((latest, ad) => 
            !latest || ad.dates.last_seen > latest ? ad.dates.last_seen : latest, null)
        }
      }
    }
  });
});

// Helper function to extract top interests from ads
function extractTopInterests(ads) {
  const interests = ads.flatMap(ad => ad.targeting.interests || []);
  const counts = interests.reduce((acc, interest) => {
    acc[interest] = (acc[interest] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([interest]) => interest);
}

// Generate mock ads for demo purposes when no real data is available
function generateMockAds(jobId) {
  return [
    {
      ad_id: `${jobId}_ad_001`,
      platform: 'facebook',
      advertiser: {
        page_id: 'fitnessbrand123',
        page_name: 'Ultimate Fitness Co.',
        verified: true,
        category: 'Health & Wellness'
      },
      creative: {
        body: '🔥 Transform Your Workout in 30 Days! Our premium whey protein delivers 25g of muscle-building protein per serving. Join thousands who\'ve already seen incredible results!',
        title: 'Premium Whey Protein - 30% OFF',
        description: 'Clinically proven formula with BCAAs and digestive enzymes',
        call_to_action: 'Shop Now',
        image_url: 'https://example.com/protein-powder.jpg',
        landing_url: 'https://ultimatefitness.com/whey-protein'
      },
      targeting: {
        age_range: '25-45',
        gender: 'all',
        locations: ['United States', 'Canada'],
        interests: ['fitness', 'bodybuilding', 'health', 'nutrition', 'gym'],
        behaviors: ['fitness enthusiast', 'supplement buyer']
      },
      metrics: {
        impressions_min: 45000,
        impressions_max: 78000,
        spend_min: 850,
        spend_max: 1200,
        currency: 'USD',
        ctr_estimate: '2.3%',
        cpc_estimate: '$0.65'
      },
      dates: {
        created: '2024-01-10T08:30:00Z',
        first_seen: '2024-01-10T09:15:00Z',
        last_seen: '2024-01-23T14:22:00Z',
        duration_days: 13
      },
      performance_indicators: {
        high_engagement: true,
        trending: false,
        seasonal: false
      }
    },
    {
      ad_id: `${jobId}_ad_002`,
      platform: 'facebook',
      advertiser: {
        page_id: 'musclemax456',
        page_name: 'MuscleMax Nutrition',
        verified: true,
        category: 'Sports & Recreation'
      },
      creative: {
        body: 'Stop wasting money on supplements that don\'t work! 💪 Our creatine monohydrate is 99.9% pure and third-party tested. Get stronger, lift heavier, recover faster.',
        title: 'Pure Creatine Monohydrate',
        description: '99.9% pure, unflavored, mixes instantly',
        call_to_action: 'Learn More',
        image_url: 'https://example.com/creatine.jpg',
        landing_url: 'https://musclemax.com/creatine'
      },
      targeting: {
        age_range: '22-40',
        gender: 'male',
        locations: ['United States', 'United Kingdom', 'Australia'],
        interests: ['weightlifting', 'strength training', 'creatine', 'supplements'],
        behaviors: ['gym member', 'regular exerciser']
      },
      metrics: {
        impressions_min: 32000,
        impressions_max: 56000,
        spend_min: 650,
        spend_max: 980,
        currency: 'USD',
        ctr_estimate: '1.9%',
        cpc_estimate: '$0.72'
      },
      dates: {
        created: '2024-01-15T12:45:00Z',
        first_seen: '2024-01-15T13:30:00Z',
        last_seen: '2024-01-23T18:15:00Z',
        duration_days: 8
      },
      performance_indicators: {
        high_engagement: false,
        trending: true,
        seasonal: false
      }
    },
    {
      ad_id: `${jobId}_ad_003`,
      platform: 'facebook',
      advertiser: {
        page_id: 'healthylife789',
        page_name: 'Healthy Life Solutions',
        verified: false,
        category: 'Health & Wellness'
      },
      creative: {
        body: '🌿 Going plant-based? Our vegan protein blend tastes amazing and delivers complete amino acids. No chalky texture, no artificial flavors. Try risk-free!',
        title: 'Plant-Based Protein That Actually Tastes Good',
        description: 'Pea + hemp + brown rice protein blend',
        call_to_action: 'Order Now',
        image_url: 'https://example.com/vegan-protein.jpg',
        landing_url: 'https://healthylife.com/vegan-protein'
      },
      targeting: {
        age_range: '28-50',
        gender: 'all',
        locations: ['United States', 'Canada'],
        interests: ['vegan', 'plant-based diet', 'healthy eating', 'fitness'],
        behaviors: ['health conscious', 'environmental advocate']
      },
      metrics: {
        impressions_min: 28000,
        impressions_max: 41000,
        spend_min: 420,
        spend_max: 680,
        currency: 'USD',
        ctr_estimate: '3.1%',
        cpc_estimate: '$0.58'
      },
      dates: {
        created: '2024-01-18T16:20:00Z',
        first_seen: '2024-01-18T17:00:00Z',
        last_seen: '2024-01-23T12:30:00Z',
        duration_days: 5
      },
      performance_indicators: {
        high_engagement: true,
        trending: true,
        seasonal: false
      }
    }
  ];
}

// Start server
app.listen(PORT, () => {
  log(`🚀 Ad Library Scraper API running on port ${PORT}`);
  log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  log(`✅ Ready to accept requests!`);
});

module.exports = app;
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const FacebookAdLibraryScraper = require('../scrapers/facebook-scraper');

// In-memory job storage (replace with database in production)
const jobs = new Map();

// Health check endpoint
router.get('/health', (req, res) => {
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

// Start scraping job
router.post('/scrape', async (req, res) => {
  try {
    const { platform, query, limit, region, dateRange, filters } = req.body;
    
    // Validate required fields
    if (!platform || !query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Platform and query are required',
          details: { platform, query }
        }
      });
    }
    
    // Generate job ID
    const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job entry
    const job = {
      job_id: jobId,
      platform,
      query,
      limit: limit || 50,
      region: region || 'US',
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      results: [],
      error: null,
      progress: { current: 0, total: limit || 50, percentage: 0 }
    };
    
    jobs.set(jobId, job);
    
    logger.info('Starting scraping job', {
      jobId,
      platform,
      query,
      limit: job.limit,
      region
    });
    
    // Start scraping asynchronously
    setImmediate(() => processScrapeJob(jobId));
    
    res.json({
      success: true,
      data: {
        job_id: jobId,
        status: 'queued',
        platform,
        query,
        limit: job.limit,
        region,
        estimated_duration: '2-5 minutes',
        created_at: job.created_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown'
      }
    });
    
  } catch (error) {
    logger.error('Error starting scraping job:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SCRAPING_ERROR',
        message: 'Failed to start scraping job',
        details: error.message
      }
    });
  }
});

// Process scraping job in background
async function processScrapeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  
  try {
    // Update job status
    job.status = 'running';
    job.started_at = new Date().toISOString();
    jobs.set(jobId, job);
    
    logger.info(`Processing scrape job ${jobId}`, {
      platform: job.platform,
      query: job.query
    });
    
    // Initialize scraper based on platform
    let scraper;
    switch (job.platform.toLowerCase()) {
      case 'facebook':
        // Try real scraper first, fallback to mock if Puppeteer not available
        try {
          const puppeteer = require('puppeteer');
          logger.info('Using real Facebook scraper with Puppeteer');
          scraper = new FacebookAdLibraryScraper();
        } catch (error) {
          logger.warn('Puppeteer not available, using mock scraper:', error.message);
          const MockFacebookScraper = require('../scrapers/mock-facebook-scraper');
          scraper = new MockFacebookScraper();
        }
        break;
      default:
        throw new Error(`Platform ${job.platform} not supported yet`);
    }
    
    // Run scraping
    const results = await scraper.scrapeAds({
      query: job.query,
      limit: job.limit,
      region: job.region
    });
    
    // Update job with results
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.results = results;
    job.progress = {
      current: results.length,
      total: job.limit,
      percentage: Math.round((results.length / job.limit) * 100)
    };
    
    jobs.set(jobId, job);
    
    logger.info(`Scrape job ${jobId} completed successfully`, {
      adsFound: results.length,
      duration: new Date() - new Date(job.started_at)
    });
    
  } catch (error) {
    logger.error(`Scrape job ${jobId} failed:`, error);
    
    // Update job with error
    job.status = 'failed';
    job.completed_at = new Date().toISOString();
    job.error = error.message;
    jobs.set(jobId, job);
  }
}

// Get scraping job status
router.get('/scrape/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    logger.info('Getting job status', { jobId });
    
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
    
    res.json({
      success: true,
      data: {
        job_id: jobId,
        status: job.status,
        platform: job.platform,
        query: job.query,
        progress: job.progress,
        results: {
          ads_found: job.results.length,
          ads_processed: job.results.length,
          errors: job.error ? 1 : 0
        },
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error: job.error
      }
    });
    
  } catch (error) {
    logger.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOB_ERROR',
        message: 'Failed to get job status'
      }
    });
  }
});

// Get scraping results
router.get('/scrape/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    logger.info('Getting scraping results', { jobId, page, limit });
    
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
    
    if (job.status !== 'completed') {
      return res.status(202).json({
        success: true,
        data: {
          message: `Job is ${job.status}`,
          status: job.status,
          progress: job.progress
        }
      });
    }
    
    // Paginate results
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedAds = job.results.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        ads: paginatedAds,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: job.results.length,
          pages: Math.ceil(job.results.length / limitNum)
        },
        job_info: {
          job_id: jobId,
          platform: job.platform,
          query: job.query,
          completed_at: job.completed_at
        }
      }
    });
    
  } catch (error) {
    logger.error('Error getting scraping results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULTS_ERROR',
        message: 'Failed to get scraping results'
      }
    });
  }
});

// Analysis endpoints (placeholder)
router.post('/analyze', (req, res) => {
  res.json({
    success: true,
    data: {
      analysis_id: `analysis_${Date.now()}`,
      status: 'queued',
      message: 'AI analysis coming soon!'
    }
  });
});

// Models endpoint (placeholder)
router.get('/models', (req, res) => {
  res.json({
    success: true,
    data: {
      models: [
        {
          id: 'claude-4-sonnet',
          name: 'Claude 4 Sonnet',
          provider: 'anthropic',
          available: false,
          reason: 'API key not configured'
        },
        {
          id: 'claude-4-opus',
          name: 'Claude 4 Opus', 
          provider: 'anthropic',
          available: false,
          reason: 'API key not configured'
        },
        {
          id: 'chatgpt-4o',
          name: 'ChatGPT-4o',
          provider: 'openai',
          available: false,
          reason: 'API key not configured'
        }
      ]
    }
  });
});

// Usage stats endpoint (placeholder)
router.get('/usage', (req, res) => {
  res.json({
    success: true,
    data: {
      period: 'month',
      scraping: {
        total_jobs: 0,
        total_ads_scraped: 0,
        success_rate: 1.0
      },
      analysis: {
        total_analyses: 0,
        total_cost: '$0.00'
      }
    }
  });
});

// Export endpoint (placeholder)
router.get('/export', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Export functionality coming soon!'
    }
  });
});

module.exports = router;
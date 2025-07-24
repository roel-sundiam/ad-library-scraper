const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const FacebookAdLibraryScraper = require('./scrapers/facebook-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory job storage for now
const jobs = new Map();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      database: 'memory',
      timestamp: new Date().toISOString()
    }
  });
});

// Start scraping job
app.post('/api/scrape', async (req, res) => {
  try {
    const { platform, query, limit, region } = req.body;
    
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
      limit: limit || 10,
      region: region || 'US',
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      results: [],
      error: null,
      progress: { current: 0, total: limit || 10, percentage: 0 }
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

// Get scraping job status
app.get('/api/scrape/:jobId', async (req, res) => {
  try {
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
app.get('/api/scrape/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
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
    
    // Use real Facebook scraper for facebook platform
    let results;
    if (job.platform.toLowerCase() === 'facebook') {
      const scraper = new FacebookAdLibraryScraper();
      results = await scraper.scrapeAds({
        query: job.query,
        limit: job.limit,
        region: job.region
      });
    } else {
      // Use mock data for other platforms
      results = generateMockResults(job);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Update job with results
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.results = results;
    job.progress = {
      current: results.length,
      total: job.limit,
      percentage: 100
    };
    
    jobs.set(jobId, job);
    
    logger.info(`Scrape job ${jobId} completed successfully`, {
      adsFound: results.length
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

// Generate mock results (will replace with real scraper)
function generateMockResults(job) {
  const results = [];
  const brands = ['Nike', 'Apple', 'Tesla', 'Amazon', 'Google'];
  
  for (let i = 0; i < Math.min(job.limit, 10); i++) {
    results.push({
      ad_id: `mock_${Date.now()}_${i}`,
      platform: job.platform,
      advertiser: {
        page_name: `${brands[i % brands.length]} ${job.query}`,
        verified: Math.random() > 0.5
      },
      creative: {
        body: `Sample ad for ${job.query}. This is mock data until real scraper is added.`,
        title: `Amazing ${job.query} Product`,
        call_to_action: 'Learn More'
      },
      metrics: {
        impressions_min: Math.floor(Math.random() * 50000) + 10000,
        spend_min: Math.floor(Math.random() * 1000) + 500,
        currency: 'USD'
      },
      scraped_at: new Date().toISOString()
    });
  }
  
  return results;
}

app.listen(PORT, () => {
  logger.info(`Ad Library Scraper API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
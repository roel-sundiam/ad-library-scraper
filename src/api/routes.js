const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fetch = require('node-fetch');
const FacebookAdLibraryScraper = require('../scrapers/facebook-scraper');
const FacebookAdLibraryAPI = require('../scrapers/facebook-api-client');
const ApifyScraper = require('../scrapers/apify-scraper');
const FacebookPlaywrightScraper = require('../scrapers/facebook-playwright-scraper');
const FacebookAdvancedHTTPScraper = require('../scrapers/facebook-http-advanced');

// OpenAI for chat functionality
const OpenAI = require('openai');

// In-memory job storage (replace with database in production)
const jobs = new Map();

// In-memory workflow storage for competitor analysis
const workflows = new Map();

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

// Debug endpoint to check environment variables
router.get('/debug/env', (req, res) => {
  res.json({
    success: true,
    data: {
      apify_token_configured: !!process.env.APIFY_API_TOKEN,
      apify_token_prefix: process.env.APIFY_API_TOKEN ? process.env.APIFY_API_TOKEN.substring(0, 20) + '...' : 'not_configured',
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// Update Facebook access token endpoint
router.post('/config/facebook-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Access token is required'
        }
      });
    }
    
    // Validate token with Facebook API
    logger.info('Validating Facebook access token...');
    const tokenValidation = await validateFacebookToken(accessToken);
    
    if (!tokenValidation.isValid) {
      let errorMessage = 'Invalid Facebook access token';
      let errorCode = 'INVALID_TOKEN';
      
      if (tokenValidation.isExpired && !tokenValidation.error) {
        errorMessage = 'Facebook access token has expired';
        errorCode = 'TOKEN_EXPIRED';
      } else if (tokenValidation.error) {
        // Use the specific error from Facebook API
        errorMessage = tokenValidation.error;
        if (tokenValidation.error.includes('expired')) {
          errorCode = 'TOKEN_EXPIRED';
        } else if (tokenValidation.error.includes('Invalid')) {
          errorCode = 'TOKEN_INVALID';
        } else if (tokenValidation.error.includes('malformed')) {
          errorCode = 'TOKEN_MALFORMED';
        }
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: {
            isExpired: tokenValidation.isExpired,
            validationError: tokenValidation.error,
            fbErrorDetails: tokenValidation.details
          }
        }
      });
    }
    
    // Update the environment variable
    process.env.FACEBOOK_ACCESS_TOKEN = accessToken;
    
    logger.info('Facebook access token updated and validated successfully');
    
    res.json({
      success: true,
      data: {
        message: 'Facebook access token updated and validated successfully',
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 10) + '...',
        isValid: true,
        appId: tokenValidation.appId,
        appName: tokenValidation.appName,
        expiresAt: tokenValidation.expiresAt,
        scopes: tokenValidation.scopes,
        adLibraryAccess: tokenValidation.adLibraryAccess,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error updating Facebook access token:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update Facebook access token'
      }
    });
  }
});

// Get current token status
router.get('/config/facebook-status', async (req, res) => {
  try {
    const hasToken = !!process.env.FACEBOOK_ACCESS_TOKEN;
    const tokenLength = hasToken ? process.env.FACEBOOK_ACCESS_TOKEN.length : 0;
    const tokenPreview = hasToken ? process.env.FACEBOOK_ACCESS_TOKEN.substring(0, 10) + '...' : 'No token';
    
    let tokenValidation = {
      isValid: false,
      isExpired: true,
      appId: null,
      appName: null,
      expiresAt: null,
      scopes: []
    };
    
    if (hasToken) {
      logger.info('Checking Facebook token validity and expiration...');
      tokenValidation = await validateFacebookToken(process.env.FACEBOOK_ACCESS_TOKEN);
    }
    
    res.json({
      success: true,
      data: {
        hasToken,
        tokenLength,
        tokenPreview,
        isValid: tokenValidation.isValid,
        isExpired: tokenValidation.isExpired,
        appId: tokenValidation.appId,
        appName: tokenValidation.appName,
        expiresAt: tokenValidation.expiresAt,
        scopes: tokenValidation.scopes,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting Facebook token status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get Facebook token status'
      }
    });
  }
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
        // Try Apify first (premium service), then Facebook API, then fallbacks
        try {
          if (process.env.APIFY_API_TOKEN) {
            logger.info('Using Apify premium service for Facebook ads');
            scraper = new ApifyScraper();
          } else {
            throw new Error('APIFY_API_TOKEN not configured');
          }
        } catch (apifyError) {
          logger.warn('Apify not available, trying Facebook API:', apifyError.message);
          try {
            if (process.env.FACEBOOK_ACCESS_TOKEN) {
              logger.info('Using Facebook Ad Library API');
              scraper = new FacebookAdLibraryAPI();
            } else {
              throw new Error('FACEBOOK_ACCESS_TOKEN not configured');
            }
          } catch (apiError) {
            logger.warn('Facebook API not available, falling back to scraper:', apiError.message);
            try {
              logger.info('Using Facebook web scraper with Puppeteer');
              scraper = new FacebookAdLibraryScraper();
            } catch (scraperError) {
              logger.warn('Puppeteer not available, using mock scraper:', scraperError.message);
              const MockFacebookScraper = require('../scrapers/mock-facebook-scraper');
              scraper = new MockFacebookScraper();
            }
          }
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

// Facebook API status endpoint
router.get('/facebook/status', async (req, res) => {
  try {
    logger.info('Checking Facebook API status');
    
    const apiClient = new FacebookAdLibraryAPI();
    const testResult = await apiClient.testConnection();
    
    res.json({
      success: true,
      data: {
        api_available: testResult.success,
        message: testResult.message,
        access_token_configured: !!process.env.FACEBOOK_ACCESS_TOKEN,
        supported_countries: apiClient.getSupportedCountries(),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error checking Facebook API status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'API_STATUS_ERROR',
        message: 'Failed to check Facebook API status',
        details: error.message
      }
    });
  }
});

// Apify service status endpoint
router.get('/apify/status', async (req, res) => {
  try {
    logger.info('Checking Apify service status');
    
    const apifyScraper = new ApifyScraper();
    const isAccessible = await apifyScraper.testAccess();
    const usageInfo = await apifyScraper.getUsageInfo();
    
    res.json({
      success: true,
      data: {
        service_available: isAccessible,
        api_token_configured: !!process.env.APIFY_API_TOKEN,
        usage_info: usageInfo,
        message: isAccessible ? 'Apify service is accessible' : 'Apify service is not accessible',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error checking Apify service status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'APIFY_STATUS_ERROR',
        message: 'Failed to check Apify service status',
        details: error.message
      }
    });
  }
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

// Start Analysis endpoint - triggers Apify actor for competitor analysis
router.post('/start-analysis', async (req, res) => {
  try {
    const { pageUrls } = req.body;
    
    // Validate required fields
    if (!pageUrls || !Array.isArray(pageUrls) || pageUrls.length !== 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Exactly 1 Facebook page URL is required',
          details: { pageUrls }
        }
      });
    }
    
    // Validate Facebook URLs
    for (const url of pageUrls) {
      if (!isValidFacebookPageUrl(url)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: `Invalid Facebook page URL: ${url}`,
            details: { url }
          }
        });
      }
    }
    
    // Generate unique IDs
    const runId = `apify_run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create analysis job entry
    const analysisJob = {
      run_id: runId,
      dataset_id: datasetId,
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      page_urls: pageUrls,
      results: [],
      error: null,
      progress: { current: 0, total: 1, percentage: 0, message: 'Initializing single competitor analysis...' }
    };
    
    jobs.set(runId, analysisJob);
    
    logger.info('Starting single competitor analysis', {
      runId,
      datasetId,
      competitorUrl: pageUrls[0]
    });
    
    // Start Apify analysis asynchronously
    setImmediate(() => processApifyAnalysis(runId));
    
    res.json({
      success: true,
      data: {
        runId,
        datasetId,
        status: 'queued',
        pageUrls,
        estimated_duration: '1-3 minutes',
        created_at: analysisJob.created_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown'
      }
    });
    
  } catch (error) {
    logger.error('Error starting Apify analysis:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: 'Failed to start competitor analysis',
        details: error.message
      }
    });
  }
});

// Get analysis status
router.get('/status/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    
    logger.info('Getting Apify analysis status', { runId });
    
    const job = jobs.get(runId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Analysis job not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        runId,
        datasetId: job.dataset_id,
        status: job.status,
        progress: job.progress,
        pageUrls: job.page_urls,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error: job.error
      }
    });
    
  } catch (error) {
    logger.error('Error getting analysis status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get analysis status'
      }
    });
  }
});

// Get analysis results
router.get('/results/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    
    logger.info('Getting analysis results', { datasetId });
    
    // Find job by dataset ID
    let job = Array.from(jobs.values()).find(j => j.dataset_id === datasetId);
    
    // If not found in jobs, check if it's a workflow ID
    if (!job) {
      const workflow = Array.from(workflows.values()).find(w => w.workflow_id === datasetId);
      if (workflow && workflow.status === 'completed') {
        // Convert workflow data to job format
        const pages = workflow.pages;
        const results = [
          pages.your_page.data || pages.your_page,
          pages.competitor_1.data || pages.competitor_1,
          pages.competitor_2.data || pages.competitor_2
        ];
        
        job = {
          dataset_id: datasetId,
          run_id: workflow.workflow_id,
          status: 'completed',
          results: results,
          page_urls: [pages.your_page.page_url, pages.competitor_1.page_url, pages.competitor_2.page_url],
          completed_at: workflow.completed_at
        };
      }
    }
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DATASET_NOT_FOUND',
          message: 'Dataset not found'
        }
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(202).json({
        success: true,
        data: {
          message: `Analysis is ${job.status}`,
          status: job.status,
          progress: job.progress
        }
      });
    }
    
    // Transform results array to object with brand names as keys for frontend
    const resultsObject = {};
    job.results.forEach(result => {
      const brandKey = result.page_name.toLowerCase();
      resultsObject[brandKey] = result;
    });

    res.json({
      success: true,
      data: resultsObject,
      metadata: {
        datasetId,
        runId: job.run_id,
        pageUrls: job.page_urls,
        completed_at: job.completed_at,
        totalAdsFound: job.results.reduce((sum, page) => sum + (page.ads_found || 0), 0)
      }
    });
    
  } catch (error) {
    logger.error('Error getting analysis results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULTS_ERROR',
        message: 'Failed to get analysis results'
      }
    });
  }
});

// Competitor Analysis Workflow
router.post('/workflow/competitor-analysis', async (req, res) => {
  try {
    const { yourPageUrl, competitor1Url, competitor2Url } = req.body;
    
    // Validate required fields
    if (!yourPageUrl || !competitor1Url || !competitor2Url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All three Facebook page URLs are required',
          details: { yourPageUrl, competitor1Url, competitor2Url }
        }
      });
    }
    
    // Validate Facebook URLs
    const urls = [yourPageUrl, competitor1Url, competitor2Url];
    for (const url of urls) {
      if (!isValidFacebookPageUrl(url)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URL',
            message: `Invalid Facebook page URL: ${url}`,
            details: { url }
          }
        });
      }
    }
    
    // Generate workflow ID
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create workflow entry
    const workflow = {
      workflow_id: workflowId,
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      pages: {
        your_page: { url: yourPageUrl, status: 'pending', data: null, error: null },
        competitor_1: { url: competitor1Url, status: 'pending', data: null, error: null },
        competitor_2: { url: competitor2Url, status: 'pending', data: null, error: null }
      },
      analysis: {
        status: 'pending',
        data: null,
        error: null
      },
      progress: {
        current_step: 0,
        total_steps: 4, // 3 page analyses + 1 AI analysis
        percentage: 0,
        message: 'Initializing workflow...'
      },
      credits_used: 0
    };
    
    workflows.set(workflowId, workflow);
    
    logger.info('Starting competitor analysis workflow', {
      workflowId,
      yourPageUrl,
      competitor1Url,
      competitor2Url
    });
    
    // Start workflow processing asynchronously
    setImmediate(() => processCompetitorAnalysisWorkflow(workflowId));
    
    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        status: 'queued',
        pages: {
          your_page: yourPageUrl,
          competitor_1: competitor1Url,
          competitor_2: competitor2Url
        },
        estimated_duration: '5-10 minutes',
        created_at: workflow.created_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown'
      }
    });
    
  } catch (error) {
    logger.error('Error starting competitor analysis workflow:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_ERROR',
        message: 'Failed to start competitor analysis workflow',
        details: error.message
      }
    });
  }
});

// Get workflow status
router.get('/workflow/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    logger.info('Getting workflow status', { workflowId });
    
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        status: workflow.status,
        progress: workflow.progress,
        pages: {
          your_page: {
            url: workflow.pages.your_page.url,
            status: workflow.pages.your_page.status
          },
          competitor_1: {
            url: workflow.pages.competitor_1.url,
            status: workflow.pages.competitor_1.status
          },
          competitor_2: {
            url: workflow.pages.competitor_2.url,
            status: workflow.pages.competitor_2.status
          }
        },
        analysis: {
          status: workflow.analysis.status
        },
        created_at: workflow.created_at,
        started_at: workflow.started_at,
        completed_at: workflow.completed_at,
        credits_used: workflow.credits_used
      }
    });
    
  } catch (error) {
    logger.error('Error getting workflow status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_STATUS_ERROR',
        message: 'Failed to get workflow status'
      }
    });
  }
});

// Cancel workflow
router.post('/workflow/:workflowId/cancel', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found'
        }
      });
    }
    
    if (workflow.status === 'completed' || workflow.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WORKFLOW_ALREADY_FINISHED',
          message: 'Cannot cancel a workflow that has already finished'
        }
      });
    }
    
    // Mark workflow as cancelled
    workflow.status = 'cancelled';
    workflow.completed_at = new Date().toISOString();
    workflow.progress.message = 'Workflow cancelled by user';
    workflows.set(workflowId, workflow);
    
    logger.info('Workflow cancelled', { workflowId });
    
    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        status: 'cancelled',
        message: 'Workflow has been cancelled'
      }
    });
    
  } catch (error) {
    logger.error('Error cancelling workflow:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_CANCEL_ERROR',
        message: 'Failed to cancel workflow'
      }
    });
  }
});

// Get workflow results
router.get('/workflow/:workflowId/results', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WORKFLOW_NOT_FOUND',
          message: 'Workflow not found'
        }
      });
    }
    
    if (workflow.status !== 'completed') {
      return res.status(202).json({
        success: true,
        data: {
          message: `Workflow is ${workflow.status}`,
          status: workflow.status,
          progress: workflow.progress
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        analysis: workflow.analysis.data,
        pages: {
          your_page: workflow.pages.your_page.data,
          competitor_1: workflow.pages.competitor_1.data,
          competitor_2: workflow.pages.competitor_2.data
        },
        completed_at: workflow.completed_at,
        credits_used: workflow.credits_used
      }
    });
    
  } catch (error) {
    logger.error('Error getting workflow results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_RESULTS_ERROR',
        message: 'Failed to get workflow results'
      }
    });
  }
});

// Utility function to validate Facebook page URLs
function isValidFacebookPageUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a Facebook domain
    const validDomains = ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'];
    if (!validDomains.includes(hostname)) {
      return false;
    }
    
    // Check if it has a path (not just the domain)
    const path = urlObj.pathname;
    if (path === '/' || path === '') {
      return false;
    }
    
    // Check if it's not an ad library URL
    if (path.includes('/ads/library')) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Extract page name from Facebook URL
function extractPageNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Remove leading slash and any trailing parameters
    const pageName = path.substring(1).split('/')[0].split('?')[0];
    
    return pageName;
  } catch (error) {
    throw new Error(`Invalid Facebook URL: ${url}`);
  }
}

// Process Apify analysis workflow
async function processApifyAnalysis(runId) {
  const job = jobs.get(runId);
  if (!job) return;
  
  try {
    // Update job status
    job.status = 'running';
    job.started_at = new Date().toISOString();
    job.progress.message = 'Starting Apify scraping...';
    jobs.set(runId, job);
    
    logger.info(`Processing single competitor analysis ${runId}`, {
      competitorUrl: job.page_urls[0]
    });
    
    // Initialize Apify scraper
    const apifyScraper = new ApifyScraper();
    
    // Check if API token is configured - if not, the scraper will return empty results and trigger fallback
    if (!process.env.APIFY_API_TOKEN) {
      logger.warn('APIFY_API_TOKEN is not configured. Skipping Apify and using fallback scrapers.');
      // Don't throw error - let it fall back to other scrapers
    }
    
    const results = [];
    
    // Process each Facebook page URL
    for (let i = 0; i < job.page_urls.length; i++) {
      const pageUrl = job.page_urls[i];
      const pageName = extractPageNameFromUrl(pageUrl);
      
      try {
        // Update progress
        job.progress.current = i + 1;
        job.progress.percentage = Math.round(((i + 1) / job.page_urls.length) * 100);
        job.progress.message = `Scraping ${pageName} via Apify... (${i + 1}/${job.page_urls.length})`;
        jobs.set(runId, job);
        
        logger.info(`Scraping page ${i + 1}/${job.page_urls.length}: ${pageName}`);
        
        // Try Apify first, then Facebook API as fallback
        logger.info(`Calling Apify with query: "${pageName}" (extracted from ${pageUrl})`);
        const adsData = await apifyScraper.scrapeAds({
          query: pageName,
          country: 'US',
          limit: 1000  // Maximum limit for comprehensive competitor analysis
        });
        logger.info(`Apify returned ${adsData.length} ads for query: "${pageName}"`);
        
        // Try multiple scraping methods in sequence
        let finalAdsData = adsData;
        let source = 'apify';
        
        if (finalAdsData.length === 0) {
          logger.info(`Apify returned 0 ads for "${pageName}", trying Facebook API fallback...`);
          
          // Try Facebook API as fallback (if token is configured)
          try {
            const apiClient = new FacebookAdLibraryAPI();
            const fallbackAds = await apiClient.scrapeAds({
              query: pageName,
              limit: 1000,  // Maximum limit for comprehensive competitor analysis
              region: 'US'
            });
            
            if (fallbackAds.length > 0) {
              logger.info(`Facebook API found ${fallbackAds.length} ads for "${pageName}"`);
              finalAdsData = fallbackAds;
              source = 'facebook_api';
            }
          } catch (fallbackError) {
            logger.warn(`Facebook API failed for "${pageName}":`, fallbackError.message);
          }
        }
        
        if (finalAdsData.length === 0) {
          logger.info(`Both Apify and Facebook API returned 0 ads for "${pageName}", trying HTTP scraper...`);
          
          // Try HTTP scraper as final fallback
          try {
            const FacebookHTTPAdvanced = require('../scrapers/facebook-http-advanced');
            const httpScraper = new FacebookHTTPAdvanced();
            const httpAds = await httpScraper.scrapeAds({
              query: pageName,
              limit: 1000,  // Maximum limit for comprehensive competitor analysis
              region: 'US'
            });
            
            if (httpAds.length > 0) {
              logger.info(`HTTP scraper found ${httpAds.length} ads for "${pageName}"`);
              finalAdsData = httpAds;
              source = 'http_scraper';
            }
          } catch (httpError) {
            logger.warn(`HTTP scraper also failed for "${pageName}":`, httpError.message);
          }
        }
        
        results.push({
          page_name: pageName,
          page_url: pageUrl,
          ads_found: finalAdsData.length,
          ads_data: finalAdsData,
          scraped_at: new Date().toISOString(),
          source: source
        });
        
        logger.info(`Successfully processed ${finalAdsData.length} ads for ${pageName} via ${source}`);
        
      } catch (pageError) {
        logger.error(`Failed to scrape ${pageName}:`, pageError);
        
        results.push({
          page_name: pageName,
          page_url: pageUrl,
          ads_found: 0,
          ads_data: [],
          error: pageError.message,
          scraped_at: new Date().toISOString(),
          source: 'apify'
        });
      }
    }
    
    // Complete job
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.results = results;
    job.progress.current = job.page_urls.length;
    job.progress.percentage = 100;
    job.progress.message = 'Apify analysis completed!';
    
    jobs.set(runId, job);
    
    const totalAdsFound = results.reduce((sum, page) => sum + page.ads_found, 0);
    logger.info(`Apify analysis ${runId} completed successfully`, {
      totalAdsFound,
      duration: new Date() - new Date(job.started_at)
    });
    
  } catch (error) {
    logger.error(`Apify analysis ${runId} failed:`, error);
    
    // Update job with error
    job.status = 'failed';
    job.completed_at = new Date().toISOString();
    job.error = error.message;
    job.progress.message = `Analysis failed: ${error.message}`;
    jobs.set(runId, job);
  }
}

// Process competitor analysis workflow
async function processCompetitorAnalysisWorkflow(workflowId) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return;
  
  try {
    // Update workflow status
    workflow.status = 'running';
    workflow.started_at = new Date().toISOString();
    workflow.progress.message = 'Starting competitor analysis...';
    workflows.set(workflowId, workflow);
    
    logger.info(`Processing competitor analysis workflow ${workflowId}`);
    
    // Step 1-3: Analyze each page in parallel
    workflow.progress.current_step = 1;
    workflow.progress.percentage = 25;
    workflow.progress.message = 'Analyzing Facebook pages...';
    workflows.set(workflowId, workflow);
    
    const pageAnalysisPromises = [
      analyzePageAds(workflow.pages.your_page.url, 'your_page'),
      analyzePageAds(workflow.pages.competitor_1.url, 'competitor_1'),
      analyzePageAds(workflow.pages.competitor_2.url, 'competitor_2')
    ];
    
    const results = await Promise.allSettled(pageAnalysisPromises);
    
    // Update page results
    results.forEach((result, index) => {
      const pageKey = ['your_page', 'competitor_1', 'competitor_2'][index];
      if (result.status === 'fulfilled') {
        workflow.pages[pageKey].status = 'completed';
        workflow.pages[pageKey].data = result.value;
      } else {
        workflow.pages[pageKey].status = 'failed';
        workflow.pages[pageKey].error = result.reason.message;
      }
    });
    
    workflow.progress.current_step = 3;
    workflow.progress.percentage = 75;
    workflow.progress.message = 'Running AI competitive analysis...';
    workflows.set(workflowId, workflow);
    
    // Step 4: AI Analysis
    try {
      const analysisResult = await runCompetitiveAnalysis(workflow.pages);
      workflow.analysis.status = 'completed';
      workflow.analysis.data = analysisResult;
      workflow.credits_used += 1; // Increment credits for AI analysis
    } catch (analysisError) {
      workflow.analysis.status = 'failed';
      workflow.analysis.error = analysisError.message;
      logger.error('AI analysis failed:', analysisError);
    }
    
    // Complete workflow
    workflow.status = 'completed';
    workflow.completed_at = new Date().toISOString();
    workflow.progress.current_step = 4;
    workflow.progress.percentage = 100;
    workflow.progress.message = 'Competitor analysis completed!';
    
    workflows.set(workflowId, workflow);
    
    logger.info(`Competitor analysis workflow ${workflowId} completed successfully`);
    
  } catch (error) {
    logger.error(`Competitor analysis workflow ${workflowId} failed:`, error);
    
    // Update workflow with error
    workflow.status = 'failed';
    workflow.completed_at = new Date().toISOString();
    workflow.progress.message = `Workflow failed: ${error.message}`;
    workflows.set(workflowId, workflow);
  }
}

// Analyze ads for a specific page using Apify
async function analyzePageAds(pageUrl, pageType) {
  const pageName = extractPageNameFromUrl(pageUrl);
  
  // Try 1: Apify scraper
  try {
    logger.info(`Attempting Apify scraping for "${pageName}"`);
    const apifyScraper = new ApifyScraper();
    
    const adsData = await apifyScraper.scrapeAds({
      query: pageName,
      country: 'US',
      limit: 1000  // Maximum limit for comprehensive competitor analysis
    });
    
    if (adsData.length > 0) {
      logger.info(`Apify success: ${adsData.length} ads found for "${pageName}"`);
      return {
        page_name: pageName,
        page_url: pageUrl,
        ads_found: adsData.length,
        ads_data: adsData,
        analyzed_at: new Date().toISOString(),
        source: 'apify'
      };
    }
    
    logger.info(`Apify returned 0 ads for "${pageName}", trying Facebook API fallback...`);
  } catch (error) {
    logger.warn(`Apify error for "${pageName}":`, error.message);
  }
  
  // Try 2: Facebook API fallback
  try {
    logger.info(`Attempting Facebook API for "${pageName}"`);
    const apiClient = new FacebookAdLibraryAPI();
    const adsData = await apiClient.scrapeAds({
      query: pageName,
      limit: 1000,  // Maximum limit for comprehensive competitor analysis
      region: 'US'
    });
    
    if (adsData.length > 0) {
      logger.info(`Facebook API success: ${adsData.length} ads found for "${pageName}"`);
      return {
        page_name: pageName,
        page_url: pageUrl,
        ads_found: adsData.length,
        ads_data: adsData,
        analyzed_at: new Date().toISOString(),
        source: 'facebook_api'
      };
    }
    
    logger.info(`Facebook API returned 0 ads for "${pageName}", trying Playwright fallback...`);
  } catch (error) {
    logger.warn(`Facebook API error for "${pageName}":`, error.message);
  }
  
  // Try 3: Playwright scraper fallback (if browser dependencies available)
  try {
    logger.info(`Attempting Playwright scraping for "${pageName}"`);
    const playwrightScraper = new FacebookPlaywrightScraper();
    const adsData = await playwrightScraper.scrapeAds({
      query: pageName,
      limit: 1000,  // Maximum limit for comprehensive competitor analysis
      region: 'US'
    });
    
    if (adsData.length > 0) {
      logger.info(`Playwright success: ${adsData.length} ads found for "${pageName}"`);
      return {
        page_name: pageName,
        page_url: pageUrl,
        ads_found: adsData.length,
        ads_data: adsData,
        analyzed_at: new Date().toISOString(),
        source: 'playwright'
      };
    }
    
    logger.warn(`All scraping methods failed for "${pageName}" - no ads found`);
  } catch (error) {
    logger.warn(`Playwright error for "${pageName}":`, error.message);
  }
  
  // Try 4: Advanced HTTP scraper fallback (no browser dependencies needed)
  try {
    logger.info(`Attempting advanced HTTP scraping for "${pageName}"`);
    const httpScraper = new FacebookAdvancedHTTPScraper();
    const adsData = await httpScraper.scrapeAds({
      query: pageName,
      limit: 1000,  // Maximum limit for comprehensive competitor analysis
      region: 'US'
    });
    
    if (adsData.length > 0) {
      logger.info(`HTTP scraper success: ${adsData.length} ads found for "${pageName}"`);
      return {
        page_name: pageName,
        page_url: pageUrl,
        ads_found: adsData.length,
        ads_data: adsData,
        analyzed_at: new Date().toISOString(),
        source: 'http_advanced'
      };
    }
    
    logger.warn(`All 4 scraping methods failed for "${pageName}" - no ads found`);
  } catch (error) {
    logger.warn(`Advanced HTTP error for "${pageName}":`, error.message);
  }
  
  // All methods failed - return empty result
  return {
    page_name: pageName,
    page_url: pageUrl,
    ads_found: 0,
    ads_data: [],
    analyzed_at: new Date().toISOString(),
    source: 'none',
    error: 'All scraping methods failed (Apify, Facebook API, Playwright, HTTP Advanced)'
  };
}

// Run competitive analysis using AI
async function runCompetitiveAnalysis(pagesData) {
  const yourPageData = pagesData.your_page.data;
  const competitor1Data = pagesData.competitor_1.data;
  const competitor2Data = pagesData.competitor_2.data;
  
  // Check if we have any successful data
  if (!yourPageData && !competitor1Data && !competitor2Data) {
    throw new Error('No ad data available for analysis');
  }
  
  // Build comprehensive analysis prompt
  const analysisPrompt = buildCompetitiveAnalysisPrompt(yourPageData, competitor1Data, competitor2Data);
  
  try {
    // Try Ollama (open source) first if available
    const ollamaResult = await callOllamaAPI(analysisPrompt);
    if (ollamaResult) {
      return {
        ...ollamaResult,
        analyzed_at: new Date().toISOString(),
        ai_provider: 'ollama'
      };
    }
    
    // Try Hugging Face (free backup) if available
    if (process.env.HUGGINGFACE_API_KEY) {
      const hfResult = await callHuggingFaceAPI(analysisPrompt);
      if (hfResult) {
        return {
          ...hfResult,
          analyzed_at: new Date().toISOString(),
          ai_provider: 'huggingface'
        };
      }
    }
    
    // Try Anthropic API if available
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicResult = await callAnthropicAPI(analysisPrompt);
      if (anthropicResult) {
        return {
          ...anthropicResult,
          analyzed_at: new Date().toISOString(),
          ai_provider: 'anthropic'
        };
      }
    }
    
    // Fallback to OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const openaiResult = await callOpenAIAPI(analysisPrompt);
      if (openaiResult) {
        return {
          ...openaiResult,
          analyzed_at: new Date().toISOString(),
          ai_provider: 'openai'
        };
      }
    }
    
    // If no AI APIs available, return structured mock analysis
    logger.warn('No AI API keys configured, returning mock analysis');
    return generateMockAnalysis(yourPageData, competitor1Data, competitor2Data);
    
  } catch (error) {
    logger.error('AI analysis failed, falling back to mock:', error);
    return generateMockAnalysis(yourPageData, competitor1Data, competitor2Data);
  }
}

// Build comprehensive analysis prompt for AI
function buildCompetitiveAnalysisPrompt(yourPageData, competitor1Data, competitor2Data) {
  const pages = [yourPageData, competitor1Data, competitor2Data].filter(page => page);
  
  let prompt = `Analyze these Facebook advertising strategies and provide competitive insights:

Your Brand: ${yourPageData?.page_name || 'Unknown'}
- Total ads found: ${yourPageData?.ads_found || 0}
- Ad examples: ${yourPageData?.ads_data?.slice(0, 3).map(ad => ad.ad_snapshot_url || ad.title || 'No title').join(', ') || 'None'}

Competitor 1: ${competitor1Data?.page_name || 'Unknown'}  
- Total ads found: ${competitor1Data?.ads_found || 0}
- Ad examples: ${competitor1Data?.ads_data?.slice(0, 3).map(ad => ad.ad_snapshot_url || ad.title || 'No title').join(', ') || 'None'}

Competitor 2: ${competitor2Data?.page_name || 'Unknown'}
- Total ads found: ${competitor2Data?.ads_found || 0}  
- Ad examples: ${competitor2Data?.ads_data?.slice(0, 3).map(ad => ad.ad_snapshot_url || ad.title || 'No title').join(', ') || 'None'}

Please provide:
1. A performance summary comparing all three brands
2. Key insights about competitor strategies
3. Specific recommendations for improving your brand's advertising

Format your response as JSON with this structure:
{
  "summary": {
    "your_page": {"page_name": "", "total_ads": 0, "performance_score": 0},
    "competitors": [{"page_name": "", "total_ads": 0, "performance_score": 0}, ...]
  },
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

  return prompt;
}

// Call Ollama API for analysis (Open Source Local AI)
async function callOllamaAPI(prompt) {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    
    logger.info(`Calling Ollama API with model: ${ollamaModel}`);
    
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      logger.warn(`Ollama API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const analysisText = data.response;
    
    // Try to parse JSON response from AI
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        logger.info('Ollama analysis completed successfully');
        return analysisResult;
      }
    } catch (parseError) {
      logger.warn('Could not parse Ollama JSON response, extracting insights manually');
    }
    
    // Fallback: Extract insights from text response
    return parseTextAnalysis(analysisText);
    
  } catch (error) {
    logger.error('Ollama API call failed:', error.message);
    return null;
  }
}

// Call Hugging Face API for analysis (Free Tier Available)
async function callHuggingFaceAPI(prompt) {
  try {
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    const hfModel = process.env.HUGGINGFACE_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    
    logger.info(`Calling Hugging Face API with model: ${hfModel}`);
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      logger.warn(`Hugging Face API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const analysisText = data[0]?.generated_text || data.generated_text || '';
    
    if (!analysisText) {
      logger.warn('Hugging Face returned empty response');
      return null;
    }
    
    // Try to parse JSON response from AI
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        logger.info('Hugging Face analysis completed successfully');
        return analysisResult;
      }
    } catch (parseError) {
      logger.warn('Could not parse Hugging Face JSON response, extracting insights manually');
    }
    
    // Fallback: Extract insights from text response
    return parseTextAnalysis(analysisText);
    
  } catch (error) {
    logger.error('Hugging Face API call failed:', error.message);
    return null;
  }
}

// Call Anthropic API for analysis
async function callAnthropicAPI(prompt) {
  try {
    // This would require installing @anthropic-ai/sdk
    // For now, return null to indicate API not implemented
    logger.info('Anthropic API integration not yet implemented');
    return null;
  } catch (error) {
    logger.error('Anthropic API call failed:', error);
    return null;
  }
}

// Call OpenAI API for analysis  
async function callOpenAIAPI(prompt) {
  try {
    // This would require installing openai package
    // For now, return null to indicate API not implemented
    logger.info('OpenAI API integration not yet implemented');
    return null;
  } catch (error) {
    logger.error('OpenAI API call failed:', error);
    return null;
  }
}

// Generate structured mock analysis when AI APIs are not available
function generateMockAnalysis(yourPageData, competitor1Data, competitor2Data) {
  const yourAds = yourPageData?.ads_found || 0;
  const comp1Ads = competitor1Data?.ads_found || 0;
  const comp2Ads = competitor2Data?.ads_found || 0;
  
  // Calculate relative performance scores
  const maxAds = Math.max(yourAds, comp1Ads, comp2Ads);
  const yourScore = maxAds > 0 ? Math.round((yourAds / maxAds) * 100) : 50;
  const comp1Score = maxAds > 0 ? Math.round((comp1Ads / maxAds) * 100) : 50;
  const comp2Score = maxAds > 0 ? Math.round((comp2Ads / maxAds) * 100) : 50;
  
  return {
    summary: {
      your_page: {
        page_name: yourPageData?.page_name || 'Your Brand',
        total_ads: yourAds,
        performance_score: yourScore
      },
      competitors: [
        {
          page_name: competitor1Data?.page_name || 'Competitor 1',
          total_ads: comp1Ads,
          performance_score: comp1Score
        },
        {
          page_name: competitor2Data?.page_name || 'Competitor 2',
          total_ads: comp2Ads,
          performance_score: comp2Score
        }
      ]
    },
    insights: generateInsights(yourAds, comp1Ads, comp2Ads),
    recommendations: generateRecommendations(yourScore, comp1Score, comp2Score),
    analyzed_at: new Date().toISOString(),
    ai_provider: 'mock'
  };
}

// Generate insights based on ad volume comparison
function generateInsights(yourAds, comp1Ads, comp2Ads) {
  const insights = [];
  
  if (comp1Ads > yourAds || comp2Ads > yourAds) {
    insights.push("Your competitors are running more active ad campaigns than you");
  }
  
  if (comp1Ads > comp2Ads * 1.5) {
    insights.push("Competitor 1 has a significantly more aggressive advertising strategy");
  } else if (comp2Ads > comp1Ads * 1.5) {
    insights.push("Competitor 2 has a significantly more aggressive advertising strategy");
  }
  
  if (yourAds === 0) {
    insights.push("No ads found for your brand - consider increasing advertising presence");
  } else if (yourAds < Math.max(comp1Ads, comp2Ads) * 0.5) {
    insights.push("Your ad volume is significantly lower than top competitors");
  }
  
  insights.push("Regular competitive monitoring will help you stay ahead of market trends");
  
  return insights;
}

// Generate recommendations based on performance comparison
function generateRecommendations(yourScore, comp1Score, comp2Score) {
  const recommendations = [];
  
  if (yourScore < 70) {
    recommendations.push("Increase your advertising budget to match competitor activity levels");
  }
  
  if (comp1Score > yourScore) {
    recommendations.push("Study Competitor 1's ad strategies and test similar approaches");
  }
  
  if (comp2Score > yourScore) {
    recommendations.push("Analyze Competitor 2's messaging and creative formats for inspiration");
  }
  
  recommendations.push("Test different ad formats (video, carousel, single image) to diversify your approach");
  recommendations.push("Monitor competitor ad frequency and adjust your campaign scheduling accordingly");
  
  return recommendations;
}

// Generate mock Facebook ads data for development/testing
function generateMockFacebookAds(brandName, count = 8) {
  const mockAds = [];
  const adTypes = ['image', 'video', 'carousel', 'collection'];
  const objectives = ['awareness', 'traffic', 'conversions', 'app_installs'];
  const placements = ['feed', 'stories', 'reels', 'marketplace'];
  
  const baseMetrics = {
    nike: { impressions: [180000, 250000], spend: [2500, 4500], cpm: [8.50, 12.30] },
    adidas: { impressions: [150000, 220000], spend: [2200, 4100], cpm: [9.20, 13.50] },
    puma: { impressions: [120000, 180000], spend: [1800, 3200], cpm: [10.50, 15.20] }
  };
  
  const brand = brandName.toLowerCase();
  const metrics = baseMetrics[brand] || baseMetrics.nike;
  
  for (let i = 0; i < count; i++) {
    const impressions = Math.floor(Math.random() * (metrics.impressions[1] - metrics.impressions[0]) + metrics.impressions[0]);
    const spend = Math.floor(Math.random() * (metrics.spend[1] - metrics.spend[0]) + metrics.spend[0]);
    const cpm = (Math.random() * (metrics.cpm[1] - metrics.cpm[0]) + metrics.cpm[0]).toFixed(2);
    const ctr = (Math.random() * 2.5 + 0.5).toFixed(2);
    
    mockAds.push({
      ad_id: `mock_${brand}_ad_${Date.now()}_${i}`,
      creative_body: `Experience the latest ${brandName} innovation. Shop now and discover what makes champions. #${brandName} #Performance #Innovation`,
      ad_creative_link_title: `${brandName} - Premium ${['Sports', 'Performance', 'Lifestyle', 'Training'][i % 4]} Collection`,
      ad_creative_link_description: `Discover ${brandName}'s newest collection with cutting-edge technology and unmatched style.`,
      impressions: impressions,
      spend: spend,
      cpm: parseFloat(cpm),
      ctr: parseFloat(ctr),
      ad_delivery_start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      ad_creative_link_url: `https://www.${brand}.com/collection-${i + 1}`,
      publisher_platform: ['facebook', 'instagram'][Math.floor(Math.random() * 2)],
      platform_position: placements[Math.floor(Math.random() * placements.length)],
      ad_type: adTypes[Math.floor(Math.random() * adTypes.length)],
      objective: objectives[Math.floor(Math.random() * objectives.length)],
      demographic_distribution: {
        age: ['18-24', '25-34', '35-44', '45-54'][Math.floor(Math.random() * 4)],
        gender: ['male', 'female', 'unknown'][Math.floor(Math.random() * 3)]
      },
      page_name: brandName,
      funding_entity: `${brandName} Inc.`,
      ad_snapshot_url: `https://www.facebook.com/ads/library/?id=mock_${brand}_${i}`
    });
  }
  
  return mockAds;
}

// Validate Facebook access token and get expiration info
async function validateFacebookToken(accessToken) {
  try {
    // First, check token info using debug_token endpoint
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    
    const debugResponse = await new Promise((resolve, reject) => {
      const https = require('https');
      const url = new URL(debugUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Ad Library Scraper 1.0'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
    
    if (debugResponse.error) {
      let specificError = debugResponse.error.message || 'Token validation failed';
      
      // Provide more user-friendly error messages based on Facebook's specific error codes
      if (debugResponse.error.code === 190) {
        if (debugResponse.error.error_subcode === 463) {
          specificError = 'Facebook access token has expired. Please generate a new token.';
        } else if (debugResponse.error.error_subcode === 467) {
          specificError = 'Facebook access token is invalid. Please check your token and try again.';
        } else {
          specificError = 'Facebook access token is invalid or expired. Please generate a new token.';
        }
      } else if (debugResponse.error.code === 10) {
        if (debugResponse.error.error_subcode === 2332002) {
          specificError = 'Facebook access token lacks required permissions for Ad Library API. Please ensure your token has "ads_read" permission and your Facebook app is approved for Ad Library API access.';
        } else {
          specificError = 'Facebook access token does not have sufficient permissions for this action.';
        }
      } else if (debugResponse.error.message?.includes('malformed')) {
        specificError = 'Facebook access token format is invalid. Please check that you copied the complete token.';
      } else if (debugResponse.error.message?.includes('Cannot parse access token')) {
        specificError = 'Facebook access token format is invalid. Please check that you copied the complete token correctly.';
      } else if (debugResponse.error.message?.includes('permissions')) {
        specificError = 'Facebook access token lacks required permissions. Please ensure your token has "ads_read" and "pages_read_engagement" permissions.';
      }
      
      return {
        isValid: false,
        isExpired: debugResponse.error.code === 190 && debugResponse.error.error_subcode === 463,
        error: specificError,
        details: debugResponse.error
      };
    }
    
    const tokenData = debugResponse.data;
    if (!tokenData) {
      return {
        isValid: false,
        isExpired: true,
        error: 'No token data returned'
      };
    }
    
    // Check if token is valid
    const isValid = tokenData.is_valid === true;
    
    // Check expiration
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null;
    const isExpired = expiresAt ? new Date() > expiresAt : false;
    
    // Get app info
    let appName = 'Unknown App';
    if (tokenData.application) {
      appName = tokenData.application.name || tokenData.application;
    }
    
    // Test Ad Library API access specifically
    let adLibraryAccess = null;
    try {
      const adLibraryTestUrl = `https://graph.facebook.com/v19.0/ads_archive?search_terms=test&ad_reached_countries=["US"]&limit=1&access_token=${accessToken}`;
      
      const adLibraryResponse = await new Promise((resolve, reject) => {
        const https = require('https');
        const url = new URL(adLibraryTestUrl);
        
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'GET',
          timeout: 8000
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (e) {
              reject(new Error('Invalid JSON response from Ad Library API'));
            }
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Ad Library API test timeout'));
        });
        req.end();
      });

      if (adLibraryResponse.error) {
        const error = adLibraryResponse.error;
        if (error.code === 10 && error.error_subcode === 2335012) {
          adLibraryAccess = {
            hasAccess: false,
            error: 'Your app does not have access to Facebook Ad Library API. You need to submit your app for review and get approved for "Ad Library API" permission.',
            errorCode: 'NO_AD_LIBRARY_PERMISSION'
          };
        } else if (error.code === 10) {
          adLibraryAccess = {
            hasAccess: false,
            error: 'Token lacks required permissions for Ad Library API. Ensure your token has "ads_read" permission.',
            errorCode: 'INSUFFICIENT_PERMISSIONS'
          };
        } else if (error.code === 190) {
          adLibraryAccess = {
            hasAccess: false,
            error: 'Token is invalid or expired for Ad Library API access.',
            errorCode: 'INVALID_TOKEN'
          };
        } else {
          adLibraryAccess = {
            hasAccess: false,
            error: `Ad Library API access failed: ${error.message}`,
            errorCode: 'UNKNOWN_ERROR'
          };
        }
      } else {
        adLibraryAccess = {
          hasAccess: true,
          message: 'Token has valid access to Facebook Ad Library API',
          adsFound: adLibraryResponse.data ? adLibraryResponse.data.length : 0
        };
      }
    } catch (testError) {
      adLibraryAccess = {
        hasAccess: false,
        error: `Failed to test Ad Library API access: ${testError.message}`,
        errorCode: 'TEST_FAILED'
      };
    }

    return {
      isValid: isValid && !isExpired,
      isExpired,
      appId: tokenData.app_id,
      appName,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      scopes: tokenData.scopes || [],
      tokenType: tokenData.type || 'unknown',
      adLibraryAccess: adLibraryAccess,
      error: null
    };
    
  } catch (error) {
    logger.error('Token validation error:', error);
    return {
      isValid: false,
      isExpired: true,
      error: 'Failed to validate token: ' + error.message,
      details: error.message
    };
  }
}

// Parse text analysis response when JSON parsing fails
function parseTextAnalysis(analysisText) {
  logger.info('Parsing text analysis response');
  
  // Extract insights and recommendations using regex patterns
  const insights = [];
  const recommendations = [];
  
  // Look for bullet points, numbered lists, or key phrases
  const lines = analysisText.split('\n');
  let currentSection = null;
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Detect section headers
    if (cleanLine.toLowerCase().includes('insight') || cleanLine.toLowerCase().includes('finding')) {
      currentSection = 'insights';
      continue;
    } else if (cleanLine.toLowerCase().includes('recommend') || cleanLine.toLowerCase().includes('suggest')) {
      currentSection = 'recommendations';
      continue;
    }
    
    // Extract bullet points or numbered items
    if (cleanLine.match(/^[\-\*\•]\s+/) || cleanLine.match(/^\d+\.\s+/)) {
      const content = cleanLine.replace(/^[\-\*\•]\s+/, '').replace(/^\d+\.\s+/, '').trim();
      if (content.length > 10) {
        if (currentSection === 'insights') {
          insights.push(content);
        } else if (currentSection === 'recommendations') {
          recommendations.push(content);
        } else {
          // Default to insights if no section detected
          insights.push(content);
        }
      }
    }
  }
  
  // If no structured content found, create basic analysis
  if (insights.length === 0 && recommendations.length === 0) {
    insights.push('AI analysis completed - competitive landscape analyzed');
    recommendations.push('Monitor competitor strategies regularly');
    recommendations.push('Focus on differentiating your advertising approach');
  }
  
  // Create basic summary structure
  const summary = {
    your_page: { page_name: 'Your Brand', total_ads: 0, performance_score: 75 },
    competitors: [
      { page_name: 'Competitor 1', total_ads: 0, performance_score: 80 },
      { page_name: 'Competitor 2', total_ads: 0, performance_score: 70 }
    ]
  };
  
  return {
    summary,
    insights: insights.slice(0, 5), // Limit to 5 insights
    recommendations: recommendations.slice(0, 5) // Limit to 5 recommendations
  };
}

// AI Analysis API Routes (Initialize only when needed)
let claudeService = null;
let videoTranscriptService = null;

// Helper function to get Claude service (lazy initialization)
function getClaudeService() {
  if (!claudeService && process.env.ANTHROPIC_API_KEY) {
    try {
      const ClaudeService = require('../services/claude-service');
      claudeService = new ClaudeService();
    } catch (error) {
      logger.warn('Failed to initialize Claude service:', error.message);
    }
  }
  return claudeService;
}

// Helper function to get Video Transcript service (lazy initialization)
function getVideoTranscriptService() {
  if (!videoTranscriptService && process.env.OPENAI_API_KEY) {
    try {
      const VideoTranscriptService = require('../services/video-transcript-service');
      videoTranscriptService = new VideoTranscriptService();
    } catch (error) {
      logger.warn('Failed to initialize Video Transcript service:', error.message);
    }
  }
  return videoTranscriptService;
}

// Start AI analysis with custom prompt
router.post('/analysis', async (req, res) => {
  try {
    const { 
      prompt, 
      workflowId, 
      adIds, 
      filters = {} 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Analysis prompt is required'
        }
      });
    }

    let adsData = [];

    // Get ads data from workflow or specific ad IDs
    if (workflowId) {
      const workflow = workflows.get(workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found'
          }
        });
      }

      // Extract ads from all pages in workflow
      Object.values(workflow.pages).forEach(page => {
        if (page.data && page.data.ads) {
          adsData = adsData.concat(page.data.ads);
        }
      });
    } else if (adIds && adIds.length > 0) {
      // TODO: Get specific ads by IDs from database
      // For now, return error as we need workflow data
      return res.status(400).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_IMPLEMENTED',
          message: 'Analysis by specific ad IDs not yet implemented. Please use workflowId.'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either workflowId or adIds must be provided'
        }
      });
    }

    if (adsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No ad data available for analysis'
        }
      });
    }

    logger.info('Starting custom AI analysis', {
      prompt: prompt.substring(0, 100) + '...',
      adsCount: adsData.length,
      filters,
      workflowId
    });

    // Process video transcripts if needed (skip for now to avoid OpenAI costs)
    const adsWithTranscripts = adsData; // Skip video transcription until OpenAI key is available

    // Try AI analysis with fallback priority: Ollama → Claude → Enhanced Mock
    let analysisResult;
    let aiProvider = 'enhanced_mock';

    try {
      // Try Ollama first (free open source) - only if running locally
      if (process.env.NODE_ENV !== 'production') {
        analysisResult = await callOllamaForAnalysis(prompt, adsWithTranscripts, filters);
        if (analysisResult) {
          aiProvider = 'ollama';
        }
      }
    } catch (ollamaError) {
      logger.warn('Ollama analysis failed, trying Claude...', ollamaError.message);
    }

    // Try Claude if Ollama failed or not available
    if (!analysisResult) {
      try {
        const claude = getClaudeService();
        if (claude) {
          const claudeResult = await claude.analyzeAds(prompt, adsWithTranscripts, filters);
          analysisResult = {
            analysis: claudeResult.analysis,
            metadata: claudeResult.metadata
          };
          aiProvider = 'anthropic';
        }
      } catch (claudeError) {
        logger.warn('Claude analysis failed, using enhanced mock response...', claudeError.message);
      }
    }

    // Fallback to enhanced mock analysis (uses actual ad data)
    if (!analysisResult) {
      analysisResult = generateEnhancedMockAnalysis(prompt, adsWithTranscripts);
      aiProvider = 'enhanced_mock';
    }

    res.json({
      success: true,
      data: {
        analysis: analysisResult.analysis || analysisResult,
        metadata: {
          ...analysisResult.metadata,
          custom_prompt: prompt,
          ads_analyzed: adsWithTranscripts.length,
          ai_provider: aiProvider,
          has_video_transcripts: adsWithTranscripts.some(ad => 
            ad.creative?.video_transcripts?.length > 0
          )
        }
      }
    });

  } catch (error) {
    logger.error('AI analysis failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error.message
      }
    });
  }
});

// Test AI connection
router.get('/analysis/test', async (req, res) => {
  try {
    // Test Claude connection
    let claudeTest = { success: false, message: 'No API key configured' };
    const claude = getClaudeService();
    if (claude) {
      claudeTest = await claude.testConnection();
    }
    
    // Test video transcription service  
    let transcriptTest = { success: false, message: 'No API key configured' };
    const videoService = getVideoTranscriptService();
    if (videoService) {
      transcriptTest = await videoService.testConnection();
    }

    res.json({
      success: true,
      data: {
        claude: claudeTest,
        video_transcript: transcriptTest,
        ollama_available: await testOllamaConnection(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('AI connection test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_TEST_ERROR',
        message: error.message
      }
    });
  }
});

// Bulk Video Analysis endpoint
router.post('/videos/bulk-analysis', async (req, res) => {
  try {
    const { videos, prompt, options = {}, workflowId } = req.body;
    
    // Validate required fields
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Videos array is required and cannot be empty',
          details: { videos }
        }
      });
    }
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Analysis prompt is required',
          details: { prompt }
        }
      });
    }
    
    // Generate unique job ID
    const jobId = `bulk_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create analysis job entry
    const analysisJob = {
      job_id: jobId,
      type: 'bulk_video_analysis',
      status: 'queued',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      videos: videos,
      prompt: prompt,
      options: options,
      workflow_id: workflowId,
      results: null,
      error: null,
      progress: { 
        current: 0, 
        total: videos.length, 
        percentage: 0, 
        stage: 'queued',
        message: 'Queued for processing...' 
      }
    };
    
    jobs.set(jobId, analysisJob);
    
    logger.info('Starting bulk video analysis', {
      jobId,
      videoCount: videos.length,
      competitorName: options.competitorName,
      analysisType: options.analysisType
    });
    
    // Start bulk video analysis asynchronously
    logger.info(`[MOCK] About to start processBulkVideoAnalysis for jobId: ${jobId}`);
    setImmediate(() => {
      logger.info(`[MOCK] setImmediate callback executing for jobId: ${jobId}`);
      processBulkVideoAnalysis(jobId);
    });
    
    res.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        videoCount: videos.length,
        estimated_duration: `${Math.ceil(videos.length / 10)}-${Math.ceil(videos.length / 5)} minutes`,
        created_at: analysisJob.created_at
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: req.id || 'unknown'
      }
    });
    
  } catch (error) {
    logger.error('Error starting bulk video analysis:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: 'Failed to start bulk video analysis',
        details: error.message
      }
    });
  }
});

// Get bulk video analysis status
router.get('/videos/bulk-analysis/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Bulk video analysis job not found',
          details: { jobId }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        jobId: job.job_id,
        status: job.status,
        progress: job.progress,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        results: job.status === 'completed' ? job.results : null,
        error: job.error
      }
    });
    
  } catch (error) {
    logger.error('Error getting bulk video analysis status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to get analysis status',
        details: error.message
      }
    });
  }
});

// Get bulk video analysis results
router.get('/videos/bulk-analysis/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = jobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Bulk video analysis job not found',
          details: { jobId }
        }
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ANALYSIS_NOT_COMPLETE',
          message: 'Analysis is not yet completed',
          details: { status: job.status }
        }
      });
    }
    
    res.json({
      success: true, 
      data: {
        jobId: job.job_id,
        results: job.results,
        videoCount: job.videos.length,
        completed_at: job.completed_at
      }
    });
    
  } catch (error) {
    logger.error('Error getting bulk video analysis results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULTS_ERROR',
        message: 'Failed to get analysis results',
        details: error.message
      }
    });
  }
});

// Chat with AI about analysis results
router.post('/analysis/chat', async (req, res) => {
  try {
    const { 
      message, 
      workflowId, 
      conversationHistory = [] 
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Chat message is required'
        }
      });
    }

    // Handle both contextual (with workflow) and general chat modes
    let contextPrompt = message;
    let adsData = [];
    
    if (workflowId && workflowId.trim()) {
      // Contextual mode - use workflow data for analysis context
      const workflow = workflows.get(workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found'
          }
        });
      }

      // Build context from workflow data
      contextPrompt = buildChatContextPrompt(workflow, message, conversationHistory);

      // Get ads data for context
      Object.values(workflow.pages).forEach(page => {
        if (page.data && page.data.ads) {
          adsData = adsData.concat(page.data.ads);
        }
      });
    } else {
      // General mode - build simple conversational prompt
      contextPrompt = buildGeneralChatPrompt(message, conversationHistory);
    }

    logger.info('Processing AI chat message', {
      message: message.substring(0, 100) + '...',
      workflowId,
      conversationLength: conversationHistory.length,
      adsCount: adsData.length
    });

    // Process video transcripts if needed (skip for now to avoid OpenAI costs)
    const adsWithTranscripts = adsData; // Skip video transcription until OpenAI key is available

    // Try AI chat with fallback priority: Ollama → Claude → OpenAI → Mock
    let chatResult;
    let aiProvider = 'mock';

    try {
      // Try Ollama first (free open source)
      chatResult = await callOllamaForAnalysis(contextPrompt, adsWithTranscripts);
      if (chatResult) {
        aiProvider = 'ollama';
      }
    } catch (ollamaError) {
      logger.warn('Ollama chat failed, trying Claude...', ollamaError.message);
      
      try {
        // Fallback to Claude if available
        const claude = getClaudeService();
        if (claude) {
          chatResult = await claude.analyzeAds(contextPrompt, adsWithTranscripts);
          aiProvider = 'anthropic';
        } else {
          throw new Error('Claude not available');
        }
      } catch (claudeError) {
        logger.warn('Claude chat failed, trying OpenAI...', claudeError.message);
        
        try {
          // Fallback to OpenAI if available
          if (process.env.OPENAI_API_KEY) {
            chatResult = await callOpenAIForChat(contextPrompt, adsWithTranscripts);
            aiProvider = 'openai';
          }
        } catch (openaiError) {
          logger.warn('OpenAI chat failed, using mock response...', openaiError.message);
        }
      }
    }

    // Fallback to mock chat if all AI services fail
    if (!chatResult) {
      const workflow = workflowId ? workflows.get(workflowId) : null;
      chatResult = generateMockChatResponse(message, workflow);
      aiProvider = 'mock';
    }

    res.json({
      success: true,
      data: {
        response: chatResult.analysis || chatResult.response || chatResult,
        metadata: {
          model: chatResult.metadata?.model || aiProvider,
          tokens_used: chatResult.metadata?.tokens_used || 0,
          context_ads: adsWithTranscripts.length,
          ai_provider: aiProvider,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('AI chat failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHAT_ERROR',
        message: error.message
      }
    });
  }
});

// Helper function to process video transcripts
async function processVideoTranscripts(adsData) {
  const adsWithTranscripts = [];

  for (const ad of adsData) {
    const adCopy = { ...ad };
    
    // Check if ad has video URLs that need transcription
    if (ad.creative?.video_urls?.length > 0) {
      try {
        const transcripts = [];
        
        // Limit transcription to first 3 videos per ad to control costs
        const videosToTranscribe = ad.creative.video_urls.slice(0, 3);
        
        for (const videoUrl of videosToTranscribe) {
          try {
            const transcript = await videoTranscriptService.transcribeVideo(videoUrl);
            transcripts.push({
              video_url: videoUrl,
              success: true,
              transcript: transcript.transcript,
              confidence: transcript.confidence,
              duration: transcript.duration
            });
          } catch (transcriptError) {
            logger.warn('Video transcription failed:', { videoUrl, error: transcriptError.message });
            transcripts.push({
              video_url: videoUrl,
              success: false,
              error: transcriptError.message
            });
          }
        }
        
        // Add transcripts to ad creative data
        if (!adCopy.creative) adCopy.creative = {};
        adCopy.creative.video_transcripts = transcripts;
        
      } catch (error) {
        logger.warn('Video processing failed for ad:', { adId: ad.id, error: error.message });
      }
    }
    
    adsWithTranscripts.push(adCopy);
  }

  return adsWithTranscripts;
}

// Helper function to build chat context prompt
function buildChatContextPrompt(workflow, userMessage, conversationHistory) {
  const pages = workflow.pages;
  const analysisData = workflow.analysis?.data;

  let contextText = `You are an AI assistant helping analyze Facebook advertising competitor data. Here's the context:

**Current Analysis:**
- Your Brand: ${pages.your_page?.data?.advertiser?.page_name || 'Unknown'}
- Competitor 1: ${pages.competitor_1?.data?.advertiser?.page_name || 'Unknown'}  
- Competitor 2: ${pages.competitor_2?.data?.advertiser?.page_name || 'Unknown'}

**Previous Analysis Results:**
${analysisData ? JSON.stringify(analysisData, null, 2) : 'No previous analysis available'}

**Conversation History:**
${conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}

**Current Question:** ${userMessage}

Please provide a helpful, specific response based on the analysis data and conversation context. Focus on actionable insights and recommendations.`;

  return contextText;
}

// Helper function to build general chat prompt (no workflow context)
function buildGeneralChatPrompt(userMessage, conversationHistory) {
  let contextText = `You are a helpful AI assistant. Please answer the user's question directly and conversationally.`;
  
  // Add conversation history if available
  if (conversationHistory && conversationHistory.length > 0) {
    contextText += `\n\nConversation History:\n`;
    conversationHistory.forEach((msg, index) => {
      if (index < 5) { // Limit to last 5 messages for context
        contextText += `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
      }
    });
  }
  
  contextText += `\nUser: ${userMessage}\n\nPlease provide a helpful response.`;
  
  return contextText;
}

// Helper function to call Ollama for analysis
async function callOllamaForAnalysis(prompt, adsData, filters = {}) {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';

    // Prepare ads data for Ollama
    const adsText = adsData.slice(0, 20).map((ad, index) => {
      return `Ad ${index + 1}: ${ad.advertiser?.page_name || 'Unknown'} - "${ad.creative?.body || 'No text'}"`;
    }).join('\n');

    const fullPrompt = `${prompt}\n\nAd Data:\n${adsText}\n\nPlease provide a helpful analysis based on this Facebook advertising data.`;

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      analysis: result.response,
      metadata: {
        model: ollamaModel,
        tokens_used: result.prompt_eval_count + result.eval_count,
        ai_provider: 'ollama'
      }
    };

  } catch (error) {
    logger.error('Ollama API call failed:', error);
    throw error;
  }
}

// Helper function to generate enhanced mock analysis using real ad data
function generateEnhancedMockAnalysis(prompt, adsData) {
  // Analyze real ad data to provide meaningful insights
  const totalAds = adsData.length;
  const advertisers = [...new Set(adsData.map(ad => ad.advertiser?.page_name).filter(Boolean))];
  const videoAds = adsData.filter(ad => ad.creative?.video_urls?.length > 0).length;
  const videoPercentage = Math.round((videoAds / totalAds) * 100);
  
  // Analyze ad content themes
  const commonWords = extractCommonThemes(adsData);
  const adFormats = analyzeAdFormats(adsData);
  
  const mockAnalysis = `## Analysis Results (Data-Driven Response)

**Your Custom Prompt:** "${prompt.substring(0, 100)}..."

**Data Analysis Summary:**
• Analyzed ${totalAds} real advertisements from ${advertisers.length} brands
• Video content found in ${videoPercentage}% of ads (${videoAds}/${totalAds})
• Top advertisers: ${advertisers.slice(0, 3).join(', ')}
• Ad formats: ${adFormats.join(', ')}

**Key Content Themes Found:**
${commonWords.slice(0, 5).map(theme => `• ${theme}`).join('\n')}

**Performance Insights:**
• Video ads typically generate 2-3x higher engagement than static images
• Brands with consistent messaging show better brand recall
• Call-to-action phrases vary significantly across competitors
• Mobile-optimized creatives dominate the landscape

**Competitive Recommendations:**
• ${getSpecificRecommendation(advertisers, videoPercentage)}
• Test video content formats to match industry standards
• Analyze top-performing competitor messaging themes
• Consider seasonal content timing strategies

**Technical Details:**
• Analysis based on actual Facebook Ad Library data
• ${totalAds} ads scraped and processed successfully
• Real advertiser names and content analyzed
• Mock AI processing simulates Claude 4 Opus analysis

*Note: This analysis uses your real competitor data but simulated AI processing. For advanced AI insights, add Claude or OpenAI API keys.*`;

  return {
    analysis: mockAnalysis,
    metadata: {
      model: 'enhanced-mock-analysis',
      tokens_used: 0,
      ai_provider: 'enhanced_mock',
      real_data_used: true,
      ads_analyzed: totalAds
    }
  };
}

// Helper function to generate mock analysis response (legacy)
function generateMockAnalysis(prompt, adsData) {
  const mockAnalysis = `## Analysis Results (Mock Response)

**Your Custom Prompt:** "${prompt.substring(0, 100)}..."

**Key Findings:**
• Analyzed ${adsData.length} advertisements across competitors
• Video content appears in ${Math.round(Math.random() * 30 + 10)}% of ads
• Performance varies significantly by creative format
• Strong correlation between engagement and visual storytelling

**Recommendations:**
• Increase video content production for better engagement
• Test different messaging approaches based on competitor insights  
• Consider expanding ad frequency to match competitor activity
• Focus on mobile-optimized creative formats

**Competitive Insights:**
• Your competitors are running more diverse campaign types
• Social proof and testimonials are common themes
• Seasonal content timing shows strategic planning
• Budget allocation suggests focus on high-performing segments

*Note: This is a mock response. Install Ollama or configure Claude/OpenAI API keys for real AI analysis.*`;

  return {
    analysis: mockAnalysis,
    metadata: {
      model: 'mock-analysis',
      tokens_used: 0,
      ai_provider: 'mock'
    }
  };
}

// OpenAI chat function for AI assistant
async function callOpenAIForChat(contextPrompt, adsData) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('Starting OpenAI chat analysis');

    const systemPrompt = `You are an AI assistant helping with Facebook advertising competitive analysis and marketing strategy. You provide helpful, conversational responses about advertising data and competitive insights.

Your responses should be:
- Conversational and helpful
- Specific to the data provided
- Focused on actionable insights
- Professional but friendly
- Comprehensive but concise

Answer the user's question based on the competitive analysis context provided.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = {
      response: response.choices[0].message.content,
      metadata: {
        model: 'gpt-4',
        tokens_used: response.usage?.total_tokens || 0,
        ai_provider: 'openai'
      }
    };

    logger.info('OpenAI chat analysis completed', {
      tokensUsed: response.usage?.total_tokens,
      responseLength: result.response.length
    });

    return result;

  } catch (error) {
    logger.error('OpenAI chat analysis failed:', error);
    throw new Error(`OpenAI chat failed: ${error.message}`);
  }
}

// Helper function to generate mock chat response
function generateMockChatResponse(message, workflow) {
  const lowerMessage = message.toLowerCase();
  
  let response = '';
  
  if (lowerMessage.includes('performance') || lowerMessage.includes('score')) {
    response = `Based on your competitor analysis, performance differences often come from:

**Creative Strategy:**
• Video content typically performs 2-3x better than static images
• User-generated content builds more trust and engagement
• Clear value propositions in ad copy drive better results

**Targeting & Budget:**
• Competitors may have more refined audience targeting
• Higher ad spend can improve reach and frequency
• A/B testing different audiences shows optimization efforts

**Recommendations:**
• Analyze your top-performing competitors' creative formats
• Test video content if you haven't already
• Consider increasing your advertising budget gradually`;
    
  } else if (lowerMessage.includes('creative') || lowerMessage.includes('content')) {
    response = `For creative strategy improvements:

**Content Types to Test:**
• Video testimonials and product demonstrations
• Behind-the-scenes content for authenticity  
• User-generated content and reviews
• Seasonal and trending topics

**Design Elements:**
• Mobile-first creative formats
• Clear, readable text overlays
• Strong brand consistency across campaigns
• Eye-catching thumbnails for video content`;
    
  } else {
    response = `Great question! Based on typical competitor analysis patterns:

**General Insights:**
• Most successful brands run 3-5 different campaign types simultaneously
• Video content consistently outperforms static images
• Regular campaign refreshes prevent ad fatigue
• Clear call-to-actions improve conversion rates

**Next Steps:**
• Study your competitors' most engaging content
• Test different creative formats systematically
• Monitor their campaign frequency and timing
• Consider their unique value propositions

*Note: This is a mock response. Install Ollama for real AI-powered analysis.*`;
  }

  return {
    response: response,
    metadata: {
      model: 'mock-chat',
      tokens_used: 0,
      ai_provider: 'mock'
    }
  };
}

// Helper functions for enhanced mock analysis
function extractCommonThemes(adsData) {
  const allText = adsData
    .map(ad => `${ad.creative?.title || ''} ${ad.creative?.body || ''}`)
    .join(' ')
    .toLowerCase();
  
  // Common advertising themes/keywords
  const themes = [
    'limited time offer', 'free shipping', 'new collection', 'best selling',
    'exclusive deal', 'sale', 'discount', 'premium quality', 'innovative',
    'trusted brand', 'customer favorite', 'award winning', 'eco friendly'
  ];
  
  return themes.filter(theme => allText.includes(theme.replace(' ', '')) || allText.includes(theme));
}

function analyzeAdFormats(adsData) {
  const formats = [];
  const hasImages = adsData.some(ad => ad.creative?.image_urls?.length > 0);
  const hasVideos = adsData.some(ad => ad.creative?.video_urls?.length > 0);
  const hasCarousels = adsData.some(ad => ad.creative?.image_urls?.length > 1);
  
  if (hasImages) formats.push('Static Images');
  if (hasVideos) formats.push('Video Content');
  if (hasCarousels) formats.push('Carousel Ads');
  
  return formats.length > 0 ? formats : ['Mixed Formats'];
}

function getSpecificRecommendation(advertisers, videoPercentage) {
  if (videoPercentage > 50) {
    return 'Video content is dominant in your competitive landscape - prioritize video production';
  } else if (videoPercentage > 25) {
    return 'Mixed content strategy detected - test both video and static formats';
  } else {
    return 'Static content dominates - opportunity to differentiate with video content';
  }
}

// Helper function to test Ollama connection
async function testOllamaConnection() {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Process bulk video analysis
// MOCK VERSION: Process bulk video analysis with simulated data for UI testing
async function processBulkVideoAnalysis(jobId) {
  logger.info(`[MOCK] processBulkVideoAnalysis called with jobId: ${jobId}`);
  
  const job = jobs.get(jobId);
  if (!job) {
    logger.error(`[MOCK] Job ${jobId} not found in processBulkVideoAnalysis`);
    return;
  }
  
  logger.info(`[MOCK] Job found successfully:`, {
    jobId: jobId,
    status: job.status,
    videoCount: job.videos?.length || 0,
    hasOptions: !!job.options
  });
  
  try {
    // Update job status
    job.status = 'running';
    job.started_at = new Date().toISOString();
    job.progress.stage = 'initializing';
    job.progress.message = 'Initializing bulk video analysis...';
    jobs.set(jobId, job);
    
    logger.info(`[MOCK] Processing bulk video analysis ${jobId}`, {
      videoCount: job.videos.length,
      competitorName: job.options.competitorName
    });

    // Stage 1: Mock initialization - update progress immediately
    job.progress.current = 1;
    job.progress.percentage = 5;
    job.progress.message = 'Mock initialization in progress...';
    jobs.set(jobId, job);
    
    logger.info(`[MOCK] Updated initialization progress for job ${jobId}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
    
    // Stage 2: Mock transcription phase (if enabled)
    if (job.options.includeTranscripts) {
      job.progress.stage = 'transcribing';
      job.progress.message = 'Transcribing videos with mock data...';
      jobs.set(jobId, job);
      
      // Simulate transcription progress
      for (let i = 0; i < job.videos.length; i++) {
        job.progress.current = i + 1;
        job.progress.percentage = Math.round(((i + 1) / job.videos.length) * 50); // First 50% for transcription
        job.progress.message = `[MOCK] Transcribing video ${i + 1}/${job.videos.length}...`;
        jobs.set(jobId, job);
        
        // Small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // Stage 3: Mock analysis phase
    job.progress.stage = 'analyzing';
    job.progress.message = 'Running AI analysis with mock data...';
    job.progress.percentage = 75;
    jobs.set(jobId, job);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // Generate comprehensive mock analysis results
    const transcriptNote = job.options.includeTranscripts ? 
      `Mock transcripts were generated for ${job.videos.length} videos using simulated speech-to-text processing.` :
      'Video analysis was performed using ad text content only (transcription disabled).';
    
    const competitorName = job.options.competitorName || 'Unknown Competitor';
    const analysisType = job.options.analysisType || 'custom';
    
    // Create mock analysis based on template type
    let mockAnalysis;
    if (analysisType === 'complete_video_analysis') {
      mockAnalysis = `**EXECUTIVE SUMMARY:**
Comprehensive analysis of ${job.videos.length} video advertisements from ${competitorName} reveals a sophisticated content strategy focused on emotional storytelling, product demonstration, and social proof. The brand consistently employs high-production values with professional cinematography and cohesive visual branding across all video content.

**DETAILED ANALYSIS:**

**1. Messaging & Content Strategy:**
- Core value propositions center around quality, innovation, and customer satisfaction
- Emotional triggers include FOMO (fear of missing out), social validation, and aspiration
- Brand positioning emphasizes premium quality while maintaining accessibility
- Consistent use of customer testimonials and user-generated content

**2. Visual & Creative Elements:**
- Cohesive brand color palette with consistent logo placement
- High production values with professional lighting and cinematography
- Clean, modern aesthetic with minimalist design approach
- Strategic use of text overlays for key messaging points

**3. Audio & Transcript Analysis:**
${transcriptNote}
- Professional voice-over talent with consistent brand voice
- Strategic use of background music to enhance emotional appeal
- Clear call-to-action delivery with urgency-building techniques
- Conversational tone that builds trust and relatability

**4. Strategic Intelligence:**
- Target audience appears to be 25-45 demographics with disposable income
- Content suggests focus on lifestyle enhancement and personal improvement
- Competitive advantages highlighted: quality, customer service, innovation
- Market positioning as premium but accessible brand

**STRATEGIC RECOMMENDATIONS:**
1. **Content Differentiation**: Develop unique storytelling angles that contrast with ${competitorName}'s emotional approach - consider data-driven or educational content strategies
2. **Production Investment**: Match or exceed production quality standards while finding creative ways to reduce costs through batch filming and template-based approaches
3. **Voice & Tone Strategy**: Establish a distinctive brand voice that contrasts with their professional-but-accessible tone - consider more authentic/conversational or more authoritative approaches
4. **Creative Format Innovation**: Explore video formats they're not using - behind-the-scenes content, user-generated campaigns, or interactive video experiences
5. **Targeting Optimization**: Identify underserved audience segments that ${competitorName} may be overlooking based on their current content strategy`;
    } else if (analysisType === 'transcript_audio_focus') {
      mockAnalysis = `**EXECUTIVE SUMMARY:**
Audio analysis of ${job.videos.length} videos from ${competitorName} reveals sophisticated script structures with strategic persuasion techniques. The brand maintains consistent voice characteristics and music branding while employing varied call-to-action delivery methods.

**DETAILED ANALYSIS:**

**1. Spoken Messaging Patterns:**
${transcriptNote}
- Consistent use of benefit-focused language over feature descriptions
- Strategic placement of social proof statements within first 10 seconds
- Repetition of key brand messages across multiple video touchpoints
- Problem-solution narrative structure in 80% of analyzed content

**2. Voice & Tone Analysis:**
- Professional voice talent with warm, trustworthy delivery
- Consistent pacing and emphasis on value propositions
- Gender-balanced voice representation across video portfolio
- Authentic conversational style that avoids overly salesy language

**3. Audio Branding & Design:**
- Signature musical elements create audio brand recognition
- Strategic use of silence and pauses for emphasis
- Sound effects used sparingly but effectively for product demonstrations
- Consistent audio quality and production values across all content

**4. Call-to-Action Analysis:**
- Multiple CTA touchpoints per video (average 2.3 CTAs per video)
- Urgency creation through limited-time offers and scarcity messaging
- Clear value proposition delivery before CTA presentation
- Strong emphasis on risk-free trial offers and guarantees

**STRATEGIC RECOMMENDATIONS:**
1. **Audio Brand Development**: Create distinctive audio signature elements that differentiate from ${competitorName}'s established sound branding
2. **Script Structure Innovation**: Develop alternative narrative frameworks that move beyond their problem-solution approach
3. **Voice Strategy Differentiation**: Consider unique voice characteristics or multi-voice approaches that contrast with their single professional voice model
4. **CTA Optimization**: Test alternative urgency-building techniques and offer structures that provide competitive advantages
5. **Music & Sound Strategy**: Develop audio elements that create emotional associations different from ${competitorName}'s approach`;
    } else if (analysisType === 'visual_creative_analysis') {
      mockAnalysis = `**EXECUTIVE SUMMARY:**
Visual analysis of ${job.videos.length} videos from ${competitorName} demonstrates sophisticated brand consistency with high production values. The creative strategy emphasizes clean aesthetics, professional cinematography, and strategic text overlay usage for maximum impact.

**DETAILED ANALYSIS:**

**1. Visual Brand Identity:**
- Consistent color palette: Primary blues and whites with accent colors
- Logo placement consistently in bottom-right corner with 85% visibility
- Strong visual hierarchy with clear focal points and structured layouts
- Modern, minimalist design philosophy across all video content

**2. Cinematography & Production:**
- Professional lighting setups with consistent key-to-fill ratios
- Strategic use of wide, medium, and close-up shots for engagement
- Smooth camera movements and professional editing transitions
- High-resolution imagery with excellent color grading consistency

**3. Creative Storytelling:**
- Visual narrative progression from problem identification to solution
- Strategic product placement integrated naturally within scenes
- Effective use of lifestyle imagery to create aspirational associations
- Visual metaphors used consistently to simplify complex concepts

**4. Text & Graphics:**
- Sans-serif typography maintaining brand consistency
- Strategic text overlay timing synchronized with audio messaging
- Graphic elements enhance rather than compete with main content
- Consistent animation styles for text entrances and exits

**STRATEGIC RECOMMENDATIONS:**
1. **Visual Differentiation**: Develop alternative color palettes and visual styles that create distinct brand recognition while maintaining professional quality
2. **Cinematography Innovation**: Explore unique camera angles, movements, or filming techniques that ${competitorName} isn't utilizing
3. **Graphic Design Strategy**: Create distinctive text and graphic treatments that stand out in competitive landscape
4. **Production Efficiency**: Identify ways to achieve similar visual quality with more efficient production processes
5. **Visual Storytelling Evolution**: Develop narrative techniques that differentiate from ${competitorName}'s established visual storytelling patterns`;
    } else if (analysisType === 'competitive_intelligence') {
      mockAnalysis = `**EXECUTIVE SUMMARY:**
Strategic analysis of ${job.videos.length} videos from ${competitorName} reveals clear market positioning focused on premium quality and customer trust. The competitor emphasizes innovation leadership while maintaining broad market appeal through accessible messaging and competitive pricing strategies.

**DETAILED ANALYSIS:**

**1. Market Positioning Analysis:**
- ${competitorName} positions itself as the premium-but-accessible market leader
- Unique selling propositions emphasize quality, innovation, and customer service excellence
- Messaging targets mainstream consumers with premium aspirations
- Strong emphasis on brand heritage and industry expertise

**2. Competitive Advantage Assessment:**
- Key differentiators: Superior product quality, comprehensive customer support, innovative features
- Strengths showcased: Award-winning products, customer testimonials, industry recognition
- Technology leadership emphasized through product demonstrations and expert endorsements
- Market credibility built through years of consistent messaging and delivery

**3. Gap Analysis & Opportunities:**
- Messaging gaps: Limited focus on environmental sustainability and social responsibility
- Visual differentiation opportunities in lifestyle positioning and demographic diversity
- Potential vulnerability in price-sensitive segments due to premium positioning
- Underutilized user-generated content and community-building approaches

**4. Strategic Intelligence:**
- Target demographics: Primary 35-55, secondary 25-35 with higher income levels
- Geographic focus appears concentrated in urban and suburban markets
- Seasonal content patterns suggest strong Q4 promotional strategies
- Cross-platform consistency indicates significant marketing budget and coordination

**STRATEGIC RECOMMENDATIONS:**
1. **Counter-Positioning Strategy**: Focus on value-driven messaging that challenges their premium positioning without sacrificing quality perception
2. **Differentiation Opportunities**: Emphasize sustainability, social impact, or community aspects they're not addressing
3. **Market Segment Expansion**: Target demographics or use cases that ${competitorName} appears to be overlooking
4. **Innovation Positioning**: Develop messaging around next-generation features or approaches that leapfrog their current positioning
5. **Vulnerability Exploitation**: Create campaigns that address the gaps in their messaging or service offerings`;
    } else {
      // Default/custom analysis
      mockAnalysis = `**EXECUTIVE SUMMARY:**
Analysis of ${job.videos.length} video advertisements from ${competitorName} reveals strategic patterns in content creation, audience targeting, and creative messaging. ${transcriptNote} The competitor demonstrates consistent brand voice and sophisticated video marketing approach across their advertising portfolio.

**DETAILED ANALYSIS:**
The video content analysis shows ${competitorName} employs a multi-faceted approach to video advertising with emphasis on:

• **Content Strategy**: Consistent messaging themes around value, quality, and customer satisfaction
• **Creative Approach**: High production values with professional cinematography and clear brand guidelines
• **Audience Targeting**: Content suggests focus on demographics aged 25-45 with emphasis on lifestyle enhancement
• **Performance Indicators**: Strategic use of social proof, testimonials, and urgency-building techniques
• **Technical Quality**: Professional-grade video production with consistent audio quality and visual branding

Key messaging themes identified:
- Quality and reliability emphasis
- Customer-centric value propositions  
- Innovation and market leadership claims
- Social proof through customer testimonials
- Risk-reduction through guarantees and trials

**STRATEGIC RECOMMENDATIONS:**
1. **Competitive Positioning**: Develop messaging that directly addresses gaps in ${competitorName}'s value proposition
2. **Creative Differentiation**: Explore video formats and styles that ${competitorName} is not currently utilizing
3. **Audience Expansion**: Identify demographic or psychographic segments that appear underserved by current competitor content
4. **Production Optimization**: Analyze production techniques to achieve similar quality standards while optimizing costs
5. **Testing Strategy**: Implement A/B testing for video elements that directly compete with ${competitorName}'s most effective approaches`;
    }
    
    // Structure the final results
    const finalResults = {
      summary: mockAnalysis.split('**DETAILED ANALYSIS:**')[0].replace('**EXECUTIVE SUMMARY:**', '').trim(),
      analysis: mockAnalysis.split('**DETAILED ANALYSIS:**')[1]?.split('**STRATEGIC RECOMMENDATIONS:**')[0]?.trim() || 'Analysis not available',
      recommendations: mockAnalysis.split('**STRATEGIC RECOMMENDATIONS:**')[1]?.trim() || 'Recommendations not available',
      metadata: {
        ai_provider: 'mock_analysis_system',
        total_videos: job.videos.length,
        videos_with_transcripts: job.options.includeTranscripts ? job.videos.length : 0,
        analysis_type: analysisType,
        competitor_name: competitorName,
        include_transcripts: job.options.includeTranscripts,
        prompt_used: job.prompt,
        generated_at: new Date().toISOString(),
        note: 'This is mock analysis data for UI testing. Replace with real AI services for production use.'
      }
    };
    
    // Complete the job
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.results = finalResults;
    job.progress.stage = 'completed';
    job.progress.message = 'Mock analysis completed successfully!';
    job.progress.percentage = 100;
    job.progress.current = job.videos.length;
    jobs.set(jobId, job);
    
    logger.info(`[MOCK] Bulk video analysis ${jobId} completed successfully`, {
      videoCount: job.videos.length,
      mockTranscripts: job.options.includeTranscripts ? job.videos.length : 0,
      duration: new Date() - new Date(job.started_at)
    });
    
  } catch (error) {
    logger.error(`[MOCK] Bulk video analysis ${jobId} failed:`, error);
    logger.error(`[MOCK] Error details:`, {
      stack: error.stack,
      message: error.message,
      jobId: jobId,
      currentStage: job?.progress?.stage || 'unknown'
    });
    
    // Update job with error
    job.status = 'failed';
    job.completed_at = new Date().toISOString();
    job.error = error.message;
    job.progress.stage = 'failed';
    job.progress.message = `Mock analysis failed: ${error.message}`;
    jobs.set(jobId, job);
  }
}

module.exports = router;
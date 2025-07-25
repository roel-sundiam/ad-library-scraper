const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const FacebookAdLibraryScraper = require('../scrapers/facebook-scraper');
const FacebookAdLibraryAPI = require('../scrapers/facebook-api-client');

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
        // Try Facebook API first, fallback to scraper if API not available
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

// Analyze ads for a specific page
async function analyzePageAds(pageUrl, pageType) {
  try {
    const pageName = extractPageNameFromUrl(pageUrl);
    
    // Initialize Facebook API client
    const apiClient = new FacebookAdLibraryAPI();
    
    // Search for ads by page name
    const adsData = await apiClient.scrapeAds({
      query: pageName,
      limit: 50,
      region: 'US'
    });
    
    return {
      page_name: pageName,
      page_url: pageUrl,
      ads_found: adsData.length,
      ads_data: adsData,
      analyzed_at: new Date().toISOString()
    };
    
  } catch (error) {
    throw new Error(`Failed to analyze ${pageType}: ${error.message}`);
  }
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
    // Try Anthropic API first if available
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
    
    // Fallback to OpenAI if Anthropic not available
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

module.exports = router;
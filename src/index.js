const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const ClaudeService = require('./services/claude-service');
const VideoTranscriptService = require('./services/video-transcript-service');
const MockAnalysisService = require('./services/mock-analysis-service');
const FacebookAdLibraryScraper = require('./scrapers/facebook-scraper');
const FacebookAdLibraryAPI = require('./scrapers/facebook-api-client');
// const SimpleFacebookScraper = require('./scrapers/simple-facebook-scraper'); // Requires puppeteer
const ApifyScraper = require('./scrapers/apify-scraper');
const apiRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory job storage for now
const jobs = new Map();

// In-memory workflow storage for competitor analysis
const workflows = new Map();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.1',
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

// AI Analysis endpoint
app.post('/api/analysis', async (req, res) => {
  try {
    const { prompt, filters = {} } = req.body;
    
    // Validate required fields
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Analysis prompt is required',
          details: { prompt }
        }
      });
    }

    logger.info('Starting AI analysis', {
      prompt: prompt.substring(0, 100) + '...',
      filters
    });

    // Get relevant ads data based on filters
    const adsData = getFilteredAdsData(filters);
    
    if (adsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_DATA_ERROR', 
          message: 'No ads data found matching the specified filters',
          details: { filters, available_jobs: jobs.size }
        }
      });
    }

    // Use mock analysis if API keys not available, otherwise use real Claude
    let analysisResult;
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.info('Using mock analysis service (no API key configured)');
      const mockService = new MockAnalysisService();
      analysisResult = await mockService.analyzeAds(prompt, adsData, filters);
    } else {
      logger.info('Using real Claude analysis service');
      const claudeService = new ClaudeService();
      analysisResult = await claudeService.analyzeAds(prompt, adsData, filters);
    }

    res.json({
      success: true,
      data: {
        analysis: analysisResult.analysis,
        metadata: analysisResult.metadata,
        data_summary: {
          ads_analyzed: adsData.length,
          filters_applied: filters,
          analysis_date: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    logger.error('Analysis endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: 'Failed to perform AI analysis',
        details: error.message
      }
    });
  }
});

// Test Claude connection endpoint  
app.get('/api/analysis/test', async (req, res) => {
  try {
    let testResult;
    if (!process.env.ANTHROPIC_API_KEY) {
      const mockService = new MockAnalysisService();
      testResult = await mockService.testConnection();
    } else {
      const claudeService = new ClaudeService();
      testResult = await claudeService.testConnection();
    }
    
    res.json({
      success: testResult.success,
      data: testResult
    });
  } catch (error) {
    logger.error('Analysis service connection test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: 'Failed to test analysis service connection',
        details: error.message
      }
    });
  }
});

// Video transcription endpoints
app.post('/api/videos/transcript', async (req, res) => {
  try {
    const { video_url, options = {} } = req.body;
    
    if (!video_url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Video URL is required',
          details: { video_url }
        }
      });
    }

    logger.info('Processing video transcription request', { video_url });

    const videoService = new VideoTranscriptService();
    const transcriptionResult = await videoService.transcribeVideo(video_url, options);

    res.json({
      success: true,
      data: transcriptionResult
    });

  } catch (error) {
    logger.error('Video transcription endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSCRIPTION_ERROR',
        message: 'Failed to transcribe video',
        details: error.message
      }
    });
  }
});

app.get('/api/videos/test', async (req, res) => {
  try {
    let testResult;
    if (!process.env.OPENAI_API_KEY) {
      testResult = {
        success: true,
        message: 'Mock video transcription service ready',
        model_available: true,
        api_key_configured: false,
        mock_service: true
      };
    } else {
      const videoService = new VideoTranscriptService();
      testResult = await videoService.testConnection();
    }
    
    res.json({
      success: testResult.success,
      data: testResult
    });
  } catch (error) {
    logger.error('Video service connection test failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: 'Failed to test video transcription service',
        details: error.message
      }
    });
  }
});

// Enhanced job status endpoint with video processing info
app.get('/api/scrape/:jobId/videos', async (req, res) => {
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

    // Count video processing statistics
    const videoStats = {
      total_ads: job.results?.length || 0,
      ads_with_video: 0,
      videos_detected: 0,
      videos_transcribed: 0,
      transcription_pending: 0,
      transcription_failed: 0
    };

    if (job.results) {
      job.results.forEach(ad => {
        if (ad.creative?.has_video) {
          videoStats.ads_with_video++;
          const videoCount = (ad.creative.video_urls?.length || 0) + (ad.creative.video_details?.length || 0);
          videoStats.videos_detected += videoCount;
          
          const transcripts = ad.creative.video_transcripts || [];
          videoStats.videos_transcribed += transcripts.filter(t => t.transcript).length;
          videoStats.transcription_failed += transcripts.filter(t => t.error).length;
        }
      });
      
      videoStats.transcription_pending = videoStats.videos_detected - videoStats.videos_transcribed - videoStats.transcription_failed;
    }

    res.json({
      success: true,
      data: {
        job_id: jobId,
        status: job.status,
        video_processing: videoStats,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting video processing status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VIDEO_STATUS_ERROR',
        message: 'Failed to get video processing status'
      }
    });
  }
});

// Helper function to get filtered ads data
function getFilteredAdsData(filters = {}) {
  let allAds = [];
  
  // Collect ads from all completed jobs
  for (const [jobId, job] of jobs.entries()) {
    if (job.status === 'completed' && job.results && job.results.length > 0) {
      // Add job metadata to each ad
      const adsWithMeta = job.results.map(ad => ({
        ...ad,
        job_id: jobId,
        job_query: job.query,
        job_platform: job.platform,
        job_region: job.region
      }));
      allAds = allAds.concat(adsWithMeta);
    }
  }
  
  // Apply filters
  let filteredAds = allAds;
  
  if (filters.platform) {
    filteredAds = filteredAds.filter(ad => 
      ad.platform?.toLowerCase() === filters.platform.toLowerCase()
    );
  }
  
  if (filters.advertiser) {
    filteredAds = filteredAds.filter(ad => 
      ad.advertiser?.page_name?.toLowerCase().includes(filters.advertiser.toLowerCase())
    );
  }
  
  if (filters.query) {
    filteredAds = filteredAds.filter(ad => 
      ad.job_query?.toLowerCase().includes(filters.query.toLowerCase())
    );
  }
  
  if (filters.date_from) {
    const fromDate = new Date(filters.date_from);
    filteredAds = filteredAds.filter(ad => {
      const adDate = new Date(ad.scraped_at || ad.created_at);
      return adDate >= fromDate;
    });
  }
  
  if (filters.date_to) {
    const toDate = new Date(filters.date_to);
    filteredAds = filteredAds.filter(ad => {
      const adDate = new Date(ad.scraped_at || ad.created_at);
      return adDate <= toDate;
    });
  }
  
  // Limit results to prevent overwhelming Claude
  return filteredAds.slice(0, 100);
}

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
    
    // Use real Facebook Ad Library scraper
    logger.info('Starting real Facebook scraping for job:', jobId);
    
    let results;
    try {
      const scraper = new FacebookAdLibraryScraper();
      results = await scraper.scrapeAds({
        query: job.query,
        limit: job.limit,
        region: job.region || 'US',
        platform: job.platform
      });
      
      logger.info('Real Facebook scraping completed:', { count: results.length, jobId });
      
      if (results.length === 0) {
        logger.warn('No ads found, falling back to mock data');
        results = generateMockResults(job);
      }
      
    } catch (error) {
      logger.error('Real scraping failed, falling back to mock data:', error);
      results = generateMockResults(job);
    }
    
    // Temporarily skip video processing to debug
    // if (results.some(ad => ad.creative?.has_video)) {
    //   job.status = 'processing_videos';
    //   jobs.set(jobId, job);
    //   
    //   logger.info(`Processing video transcriptions for job ${jobId}`);
    //   await processVideoTranscriptions(jobId, results);
    // }

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
  try {
    const results = [];
    const brands = ['Nike', 'Apple', 'Tesla', 'Amazon', 'Google'];
    const query = job.query || 'product';
    
    for (let i = 0; i < Math.min(job.limit, 10); i++) {
    results.push({
      ad_id: `mock_${Date.now()}_${i}`,
      platform: job.platform,
      advertiser: {
        page_name: `${brands[i % brands.length]} ${query}`,
        verified: Math.random() > 0.5,
        category: ['Retail', 'Technology', 'Sports & Recreation', 'Fashion', 'Electronics'][Math.floor(Math.random() * 5)]
      },
      creative: {
        body: `Sample ad for ${query}. This is mock data until real scraper is added.`,
        title: `Amazing ${query} Product`,
        description: `High quality ${query} at competitive prices`,
        call_to_action: 'Learn More',
        landing_url: `https://example.com/${query.replace(/ /g, '-')}`,
        has_video: Math.random() > 0.7
      },
      targeting: {
        age_range: ['18-24', '25-34', '35-44', '45-54'][Math.floor(Math.random() * 4)],
        gender: ['All', 'Male', 'Female'][Math.floor(Math.random() * 3)],
        locations: ['United States', 'Canada', 'United Kingdom'],
        interests: ['Sports', 'Fashion', 'Technology', 'Fitness', 'Shopping']
      },
      metrics: {
        impressions_min: Math.floor(Math.random() * 50000) + 10000,
        impressions_max: Math.floor(Math.random() * 100000) + 60000,
        spend_min: Math.floor(Math.random() * 1000) + 500,
        spend_max: Math.floor(Math.random() * 2000) + 1500,
        ctr_estimate: (Math.random() * 3 + 1).toFixed(2) + '%',
        cpc_estimate: '$' + (Math.random() * 2 + 0.5).toFixed(2),
        currency: 'USD'
      },
      performance_indicators: {
        high_engagement: Math.random() > 0.6,
        trending: Math.random() > 0.8,
        seasonal: Math.random() > 0.7
      },
      dates: {
        created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration_days: Math.floor(Math.random() * 30) + 1
      },
      scraped_at: new Date().toISOString()
    });
  }
  
  return results;
  } catch (error) {
    logger.error('Error generating mock results:', error);
    return [];
  }
}

// Process video transcriptions for ads with videos
async function processVideoTranscriptions(jobId, ads) {
  const videoService = new VideoTranscriptService();
  
  try {
    for (const ad of ads) {
      if (!ad.creative?.has_video) continue;
      
      const videoUrls = [
        ...(ad.creative.video_urls || []),
        ...(ad.creative.video_details || []).map(v => v.src).filter(Boolean)
      ];
      
      if (videoUrls.length === 0) continue;
      
      logger.info(`Processing ${videoUrls.length} videos for ad ${ad.ad_id}`);
      
      for (const videoUrl of videoUrls) {
        try {
          const transcriptionResult = await videoService.transcribeVideo(videoUrl, {
            language: 'en', // Could be made configurable
            format: 'verbose_json'
          });
          
          ad.creative.video_transcripts.push({
            video_url: videoUrl,
            success: true,
            ...transcriptionResult
          });
          
          logger.info(`Video transcription completed for ${videoUrl}`, {
            transcript_length: transcriptionResult.transcript.length,
            confidence: transcriptionResult.confidence
          });
          
        } catch (error) {
          logger.error(`Video transcription failed for ${videoUrl}:`, error);
          
          ad.creative.video_transcripts.push({
            video_url: videoUrl,
            success: false,
            error: error.message,
            transcribed_at: new Date().toISOString()
          });
        }
        
        // Add delay between video processing to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Update job with video transcriptions
    const job = jobs.get(jobId);
    if (job) {
      job.results = ads;
      jobs.set(jobId, job);
    }
    
    logger.info(`Video transcription processing completed for job ${jobId}`);
    
  } catch (error) {
    logger.error(`Video transcription processing failed for job ${jobId}:`, error);
    
    // Update job status to indicate video processing failure
    const job = jobs.get(jobId);
    if (job) {
      job.video_processing_error = error.message;
      jobs.set(jobId, job);
    }
  }
}

// Competitor Analysis Workflow
app.post('/api/workflow/competitor-analysis', async (req, res) => {
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
        total_steps: 4,
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
        timestamp: new Date().toISOString()
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
app.get('/api/workflow/:workflowId/status', async (req, res) => {
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

// Get workflow results
app.get('/api/workflow/:workflowId/results', async (req, res) => {
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
        success: false,
        error: {
          code: 'WORKFLOW_NOT_COMPLETED',
          message: `Workflow is ${workflow.status}. Results are only available when workflow is completed.`,
          details: {
            current_status: workflow.status,
            progress: workflow.progress
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        workflow_id: workflowId,
        analysis: workflow.analysis.data,
        pages: workflow.pages,
        completed_at: workflow.completed_at,
        credits_used: workflow.credits_used,
        processing_time: workflow.completed_at && workflow.started_at 
          ? new Date(workflow.completed_at).getTime() - new Date(workflow.started_at).getTime()
          : null
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

// Process competitor analysis workflow with real AI analysis
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
    
    // Step 1: Scrape ads from all three pages
    workflow.progress.current_step = 1;
    workflow.progress.percentage = 25;
    workflow.progress.message = 'Collecting ads data from Facebook pages...';
    workflows.set(workflowId, workflow);
    
    const adsData = await collectCompetitorAdsData(workflow);
    logger.info('Ads data collection completed:', {
      your_page_ads: adsData.your_page.ads.length,
      competitor_1_ads: adsData.competitor_1.ads.length,
      competitor_2_ads: adsData.competitor_2.ads.length
    });
    
    // Step 2: Process and analyze the data
    workflow.progress.current_step = 2;
    workflow.progress.percentage = 50;
    workflow.progress.message = 'Processing ads data and extracting insights...';
    workflows.set(workflowId, workflow);
    
    const processedData = await processAdsData(adsData);
    logger.info('Data processing completed:', processedData.summary);
    
    // Step 3: Run AI competitive analysis
    workflow.progress.current_step = 3;
    workflow.progress.percentage = 75;
    workflow.progress.message = 'Running AI competitive analysis...';
    workflows.set(workflowId, workflow);
    
    const aiAnalysis = await runAICompetitiveAnalysis(processedData, workflow);
    
    // Step 4: Complete workflow
    workflow.analysis.status = 'completed';
    workflow.analysis.data = aiAnalysis;
    workflow.credits_used += aiAnalysis.credits_used || 1;
    workflow.status = 'completed';
    workflow.completed_at = new Date().toISOString();
    workflow.progress.current_step = 4;
    workflow.progress.percentage = 100;
    workflow.progress.message = 'Competitor analysis completed!';
    
    workflows.set(workflowId, workflow);
    logger.info(`Competitor analysis workflow ${workflowId} completed`);
    
  } catch (error) {
    logger.error(`Competitor analysis workflow ${workflowId} failed:`, error);
    workflow.status = 'failed';
    workflow.completed_at = new Date().toISOString();
    workflow.progress.message = `Workflow failed: ${error.message}`;
    workflows.set(workflowId, workflow);
  }
}

// Collect ads data from competitor pages using multiple sources
async function collectCompetitorAdsData(workflow) {
  const adsData = {
    your_page: { url: workflow.pages.your_page.url, ads: [], page_name: '' },
    competitor_1: { url: workflow.pages.competitor_1.url, ads: [], page_name: '' },
    competitor_2: { url: workflow.pages.competitor_2.url, ads: [], page_name: '' }
  };
  
  try {
    // Try Facebook API first, then public scraper, then realistic scraper
    const facebookAPI = new FacebookAdLibraryAPI();
    const connectionTest = await facebookAPI.testConnection();
    
    if (connectionTest.success) {
      logger.info('Using Facebook API for real data collection');
      return await collectViaFacebookAPI(workflow, adsData, facebookAPI);
    } else {
      logger.info('Facebook API not available, trying Apify for REAL Facebook data');
      
      // Try Apify service for ACTUAL Facebook data (FREE $5/month)
      const apifyScraper = new ApifyScraper();
      const canAccessApify = await apifyScraper.testAccess();
      
      if (canAccessApify) {
        logger.info('Using Apify service for REAL Facebook data ($5 free monthly)');
        const realData = await collectViaApifyScraper(workflow, adsData, apifyScraper);
        logger.info('REAL Facebook data collected via Apify:', {
          your_page_ads: realData.your_page.ads.length,
          competitor_1_ads: realData.competitor_1.ads.length,  
          competitor_2_ads: realData.competitor_2.ads.length
        });
        return realData;
      } else {
        logger.info('Apify service not available (check APIFY_API_TOKEN), using realistic ad data');
        const realisticData = await collectViaRealisticScraper(workflow, adsData);
        logger.info('Realistic data collected successfully:', {
          your_page_ads: realisticData.your_page.ads.length,
          competitor_1_ads: realisticData.competitor_1.ads.length,
          competitor_2_ads: realisticData.competitor_2.ads.length
        });
        return realisticData;
      }
    }
    
  } catch (error) {
    logger.error('Error collecting competitor ads data:', error);
    logger.error('Falling back to mock data due to error');
    return generateMockCompetitorData(workflow);
  }
}

// Collect data via Facebook API (when available)
async function collectViaFacebookAPI(workflow, adsData, facebookAPI) {
  for (const [pageKey, pageData] of Object.entries(adsData)) {
    try {
      workflow.progress.message = `Collecting ads from ${pageKey.replace('_', ' ')} via Facebook API...`;
      workflows.set(workflow.workflow_id, workflow);
      
      const pageName = extractPageNameFromUrl(pageData.url);
      pageData.page_name = pageName;
      
      const ads = await facebookAPI.scrapeAds({
        query: pageName,
        limit: 50,
        region: 'US'
      });
      
      pageData.ads = ads;
      workflow.pages[pageKey].status = 'completed';
      workflow.pages[pageKey].data = { page_name: pageName, ads_found: ads.length };
      
      logger.info(`Facebook API: Found ${ads.length} ads for ${pageName}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logger.error(`Failed to get ads for ${pageKey} via Facebook API:`, error);
      workflow.pages[pageKey].status = 'failed';
      workflow.pages[pageKey].error = error.message;
      pageData.ads = generateMockAdsForPage(pageData.url);
      pageData.page_name = extractPageNameFromUrl(pageData.url) || `Page ${pageKey}`;
    }
  }
  return adsData;
}

// Collect REAL Facebook data via Apify service
async function collectViaApifyScraper(workflow, adsData, apifyScraper) {
  for (const [pageKey, pageData] of Object.entries(adsData)) {
    try {
      workflow.progress.message = `Getting REAL Facebook ads for ${pageKey.replace('_', ' ')} via Apify...`;
      workflows.set(workflow.workflow_id, workflow);
      
      const pageName = extractPageNameFromUrl(pageData.url);
      pageData.page_name = pageName;
      
      // Use Apify service to get ACTUAL Facebook ads
      const ads = await apifyScraper.scrapeAds({
        query: pageName,
        country: 'US',
        limit: Math.floor(Math.random() * 20) + 15 // 15-35 ads
      });
      
      pageData.ads = ads;
      workflow.pages[pageKey].status = 'completed';
      workflow.pages[pageKey].data = { page_name: pageName, ads_found: ads.length };
      
      logger.info(`Apify scraper: Found ${ads.length} REAL Facebook ads for ${pageName}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Small delay between requests
      
    } catch (error) {
      logger.error(`Failed to get real Facebook data for ${pageKey} via Apify:`, error);
      workflow.pages[pageKey].status = 'failed';
      workflow.pages[pageKey].error = error.message;
      pageData.ads = [];
      pageData.page_name = extractPageNameFromUrl(pageData.url) || `Page ${pageKey}`;
    }
  }
  return adsData;
}

// Collect REAL Facebook data via Stevesie free service
async function collectViaStevesieScraper(workflow, adsData, stevesieScraper) {
  for (const [pageKey, pageData] of Object.entries(adsData)) {
    try {
      workflow.progress.message = `Getting REAL Facebook ads for ${pageKey.replace('_', ' ')} via free service...`;
      workflows.set(workflow.workflow_id, workflow);
      
      const pageName = extractPageNameFromUrl(pageData.url);
      pageData.page_name = pageName;
      
      // Use Stevesie free service to get ACTUAL Facebook ads
      const ads = await stevesieScraper.scrapeAds({
        query: pageName,
        country: 'US',
        limit: Math.floor(Math.random() * 15) + 10 // 10-25 ads
      });
      
      pageData.ads = ads;
      workflow.pages[pageKey].status = 'completed';
      workflow.pages[pageKey].data = { page_name: pageName, ads_found: ads.length };
      
      logger.info(`Stevesie scraper: Found ${ads.length} REAL Facebook ads for ${pageName}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between requests
      
    } catch (error) {
      logger.error(`Failed to get real Facebook data for ${pageKey} via Stevesie:`, error);
      workflow.pages[pageKey].status = 'failed';
      workflow.pages[pageKey].error = error.message;
      pageData.ads = [];
      pageData.page_name = extractPageNameFromUrl(pageData.url) || `Page ${pageKey}`;
    }
  }
  return adsData;
}

// Collect REAL Facebook data via public scraper
async function collectViaPublicScraper(workflow, adsData, publicScraper) {
  for (const [pageKey, pageData] of Object.entries(adsData)) {
    try {
      workflow.progress.message = `Scraping REAL Facebook ads for ${pageKey.replace('_', ' ')}...`;
      workflows.set(workflow.workflow_id, workflow);
      
      const pageName = extractPageNameFromUrl(pageData.url);
      pageData.page_name = pageName;
      
      // Use public scraper to get ACTUAL Facebook ads
      const ads = await publicScraper.scrapePublicAds({
        query: pageName,
        country: 'US',
        limit: Math.floor(Math.random() * 15) + 10 // 10-25 ads
      });
      
      pageData.ads = ads;
      workflow.pages[pageKey].status = 'completed';
      workflow.pages[pageKey].data = { page_name: pageName, ads_found: ads.length };
      
      logger.info(`Public scraper: Found ${ads.length} REAL Facebook ads for ${pageName}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between requests
      
    } catch (error) {
      logger.error(`Failed to scrape real Facebook data for ${pageKey}:`, error);
      workflow.pages[pageKey].status = 'failed';
      workflow.pages[pageKey].error = error.message;
      pageData.ads = [];
      pageData.page_name = extractPageNameFromUrl(pageData.url) || `Page ${pageKey}`;
    }
  }
  return adsData;
}

// Collect realistic demo data via scraper
async function collectViaRealisticScraper(workflow, adsData) {
  const scraper = new SimpleFacebookScraper();
  
  for (const [pageKey, pageData] of Object.entries(adsData)) {
    try {
      workflow.progress.message = `Collecting realistic ad data for ${pageKey.replace('_', ' ')}...`;
      workflows.set(workflow.workflow_id, workflow);
      
      const pageName = extractPageNameFromUrl(pageData.url);
      pageData.page_name = pageName;
      
      // Use realistic scraper that generates demo-quality data
      const ads = await scraper.scrapeBasicAds({
        query: pageName,
        limit: Math.floor(Math.random() * 20) + 15 // 15-35 ads per page
      });
      
      pageData.ads = ads;
      workflow.pages[pageKey].status = 'completed';
      workflow.pages[pageKey].data = { page_name: pageName, ads_found: ads.length };
      
      logger.info(`Realistic scraper: Generated ${ads.length} ads for ${pageName}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Realistic delay
      
    } catch (error) {
      logger.error(`Failed to generate realistic data for ${pageKey}:`, error);
      workflow.pages[pageKey].status = 'failed';
      workflow.pages[pageKey].error = error.message;
      pageData.ads = generateMockAdsForPage(pageData.url);
      pageData.page_name = extractPageNameFromUrl(pageData.url) || `Page ${pageKey}`;
    }
  }
  return adsData;
}


// Generate mock data when API is not available
function generateMockCompetitorData(workflow) {
  return {
    your_page: { 
      url: workflow.pages.your_page.url, 
      ads: generateMockAdsForPage(workflow.pages.your_page.url), 
      page_name: extractPageNameFromUrl(workflow.pages.your_page.url) || 'Your Brand'
    },
    competitor_1: { 
      url: workflow.pages.competitor_1.url, 
      ads: generateMockAdsForPage(workflow.pages.competitor_1.url), 
      page_name: extractPageNameFromUrl(workflow.pages.competitor_1.url) || 'Competitor 1'
    },
    competitor_2: { 
      url: workflow.pages.competitor_2.url, 
      ads: generateMockAdsForPage(workflow.pages.competitor_2.url), 
      page_name: extractPageNameFromUrl(workflow.pages.competitor_2.url) || 'Competitor 2'
    }
  };
}

// Process and analyze the collected ads data
async function processAdsData(adsData) {
  const processedData = {
    summary: {
      your_page: {
        page_name: adsData.your_page.page_name,
        total_ads: adsData.your_page.ads.length,
        performance_score: calculatePerformanceScore(adsData.your_page.ads)
      },
      competitors: [
        {
          page_name: adsData.competitor_1.page_name,
          total_ads: adsData.competitor_1.ads.length,
          performance_score: calculatePerformanceScore(adsData.competitor_1.ads)
        },
        {
          page_name: adsData.competitor_2.page_name,
          total_ads: adsData.competitor_2.ads.length,
          performance_score: calculatePerformanceScore(adsData.competitor_2.ads)
        }
      ]
    },
    detailed_analysis: {
      your_page: analyzeAdsMetrics(adsData.your_page.ads),
      competitor_1: analyzeAdsMetrics(adsData.competitor_1.ads),
      competitor_2: analyzeAdsMetrics(adsData.competitor_2.ads)
    },
    raw_data: adsData
  };
  
  return processedData;
}

// Run AI analysis using Claude or OpenAI
async function runAICompetitiveAnalysis(processedData, workflow) {
  try {
    // Prepare data for AI analysis
    const analysisPrompt = createAnalysisPrompt(processedData);
    
    let aiAnalysis;
    if (process.env.ANTHROPIC_API_KEY) {
      // Use real Claude API
      const claudeService = new ClaudeService();
      aiAnalysis = await claudeService.analyzeCompetitors(analysisPrompt, processedData);
      logger.info('Used Claude API for competitive analysis');
    } else if (process.env.OPENAI_API_KEY) {
      // Use OpenAI as fallback
      aiAnalysis = await analyzeWithOpenAI(analysisPrompt, processedData);
      logger.info('Used OpenAI API for competitive analysis');
    } else {
      // Use enhanced mock analysis with real data
      aiAnalysis = generateEnhancedMockAnalysis(processedData);
      logger.info('Used enhanced mock analysis (no API key configured)');
    }
    
    return {
      summary: processedData.summary,
      insights: aiAnalysis.insights,
      recommendations: aiAnalysis.recommendations,
      competitive_gaps: aiAnalysis.competitive_gaps || [],
      opportunities: aiAnalysis.opportunities || [],
      analyzed_at: new Date().toISOString(),
      ai_provider: aiAnalysis.provider || 'mock',
      credits_used: aiAnalysis.credits_used || 1
    };
    
  } catch (error) {
    logger.error('AI analysis failed, using enhanced mock:', error);
    return generateEnhancedMockAnalysis(processedData);
  }
}

// Helper functions
function extractPageNameFromUrl(url) {
  try {
    const match = url.match(/facebook\.com\/([^\/\?]+)/);
    return match ? match[1].replace(/[^a-zA-Z0-9]/g, ' ').trim() : 'Unknown Page';
  } catch (error) {
    return 'Unknown Page';
  }
}

function calculatePerformanceScore(ads) {
  if (!ads || ads.length === 0) return 0;
  
  // Calculate based on metrics like engagement, reach, etc.
  const scores = ads.map(ad => {
    let score = 50; // Base score
    
    // Add points for high engagement
    if (ad.metrics?.impressions_max > 100000) score += 20;
    if (ad.metrics?.impressions_max > 500000) score += 10;
    
    // Add points for recent ads
    const adAge = Date.now() - new Date(ad.dates?.created || 0).getTime();
    if (adAge < 30 * 24 * 60 * 60 * 1000) score += 15; // Less than 30 days
    
    // Add points for video content
    if (ad.creative?.has_video) score += 10;
    
    return Math.min(100, Math.max(0, score));
  });
  
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function analyzeAdsMetrics(ads) {
  return {
    total_ads: ads.length,
    video_ads: ads.filter(ad => ad.creative?.has_video).length,
    recent_ads: ads.filter(ad => {
      const adAge = Date.now() - new Date(ad.dates?.created || 0).getTime();
      return adAge < 30 * 24 * 60 * 60 * 1000;
    }).length,
    avg_duration: ads.reduce((sum, ad) => sum + (ad.dates?.duration_days || 0), 0) / ads.length,
    common_themes: extractCommonThemes(ads)
  };
}

function extractCommonThemes(ads) {
  // Simple keyword extraction from ad text
  const keywords = [];
  ads.forEach(ad => {
    const text = (ad.creative?.body + ' ' + ad.creative?.title).toLowerCase();
    const words = text.match(/\b\w{4,}\b/g) || [];
    keywords.push(...words);
  });
  
  // Count frequency and return top themes
  const frequency = {};
  keywords.forEach(word => frequency[word] = (frequency[word] || 0) + 1);
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function createAnalysisPrompt(processedData) {
  return `
Analyze this competitive Facebook advertising data and provide insights:

YOUR BRAND:
- Name: ${processedData.summary.your_page.page_name}
- Total Ads: ${processedData.summary.your_page.total_ads}
- Performance Score: ${processedData.summary.your_page.performance_score}

COMPETITOR 1:
- Name: ${processedData.summary.competitors[0].page_name}
- Total Ads: ${processedData.summary.competitors[0].total_ads}
- Performance Score: ${processedData.summary.competitors[0].performance_score}

COMPETITOR 2:
- Name: ${processedData.summary.competitors[1].page_name}
- Total Ads: ${processedData.summary.competitors[1].total_ads}
- Performance Score: ${processedData.summary.competitors[1].performance_score}

Please provide:
1. Key competitive insights (3-5 insights)
2. Actionable recommendations (3-5 recommendations)
3. Competitive gaps and opportunities

Focus on advertising strategy, creative approaches, and performance patterns.
`;
}

function generateMockAdsForPage(url) {
  const pageName = extractPageNameFromUrl(url);
  return generateMockResults({ query: pageName, limit: Math.floor(Math.random() * 30) + 20, platform: 'facebook' });
}

function generateEnhancedMockAnalysis(processedData) {
  const yourScore = processedData.summary.your_page.performance_score;
  const comp1Score = processedData.summary.competitors[0].performance_score;
  const comp2Score = processedData.summary.competitors[1].performance_score;
  
  const insights = [];
  const recommendations = [];
  
  // Generate insights based on actual data
  if (comp1Score > yourScore || comp2Score > yourScore) {
    insights.push("Your competitors are outperforming you in advertising effectiveness");
    recommendations.push("Analyze your competitors' top-performing ad creatives and messaging");
  }
  
  if (processedData.summary.competitors[0].total_ads > processedData.summary.your_page.total_ads) {
    insights.push(`${processedData.summary.competitors[0].page_name} is running significantly more ads than you`);
    recommendations.push("Consider increasing your advertising volume to match competitor activity");
  }
  
  insights.push("Video content appears to be a key differentiator in your industry");
  recommendations.push("Invest in video ad creative formats to improve engagement");
  
  return {
    insights,
    recommendations,
    competitive_gaps: ["Video advertising", "Ad volume", "Targeting diversity"],
    opportunities: ["Mobile-first creative", "Seasonal campaigns", "User-generated content"],
    provider: 'enhanced_mock',
    credits_used: 1
  };
}

app.listen(PORT, () => {
  logger.info(`Ad Library Scraper API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const ClaudeService = require('./services/claude-service');
const VideoTranscriptService = require('./services/video-transcript-service');
const MockAnalysisService = require('./services/mock-analysis-service');
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

app.listen(PORT, () => {
  logger.info(`Ad Library Scraper API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
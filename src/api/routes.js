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

// Import AI analysis utilities
const { analyzeWithOpenAI } = require('../utils/ai-analysis');

// Import authentication middleware
const { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  storeSession, 
  removeSession, 
  authenticateToken, 
  requireSuperAdmin 
} = require('../middleware/auth');

// Import analytics middleware
const { 
  analyticsMiddleware, 
  getAnalyticsData, 
  getUserManagementData 
} = require('../middleware/analytics');

// Import MongoDB models
const User = require('../models/User');
const UserSession = require('../models/UserSession');

// Rate limiting for auth endpoints
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});

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

// ===== AUTHENTICATION ENDPOINTS =====

// User registration endpoint
router.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, password, and full name are required'
        }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address'
        }
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long'
        }
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }
    
    try {
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user
      const newUser = new User({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        role: 'user',
        status: 'pending'
      });
      
      const savedUser = await newUser.save();
      
      logger.info(`New user registered: ${email} (ID: ${savedUser._id})`);
      
      res.status(201).json({
        success: true,
        data: {
          message: 'Registration successful! Your account is pending approval.',
          userId: savedUser._id,
          status: 'pending'
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed'
        }
      });
    }
  } catch (error) {
    logger.error('Registration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// User login endpoint
router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required'
        }
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }
    
    try {
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }
      
      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_APPROVED',
            message: user.status === 'pending' 
              ? 'Your account is pending approval' 
              : 'Your account access has been restricted'
          }
        });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      
      // Store session with metadata
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'] || '';
      
      await storeSession(user._id, tokenHash, {
        ip_address: ipAddress,
        user_agent: userAgent
      });
      
      // Update last login
      await user.updateLastLogin();
      
      logger.info(`User logged in: ${user.email} (ID: ${user._id})`);
      
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            status: user.status
          }
        }
      });
    } catch (error) {
      logger.error('Login processing error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed'
        }
      });
    }
  } catch (error) {
    logger.error('Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// User logout endpoint
router.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      await removeSession(req.user.id, tokenHash);
    }
    
    logger.info(`User logged out: ${req.user.email} (ID: ${req.user.id})`);
    
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed'
      }
    });
  }
});

// Get current user info
router.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.full_name,
        role: req.user.role,
        status: req.user.status
      }
    }
  });
});

// Change password endpoint
router.post('/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Current password and new password are required'
        }
      });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 8 characters long'
        }
      });
    }
    
    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password in database
    user.password_hash = newPasswordHash;
    user.updated_at = new Date();
    await user.save();
    
    logger.info(`Password changed for user: ${user.email} (ID: ${user.id})`);
    
    res.json({
      success: true,
      data: {
        message: 'Password changed successfully'
      }
    });
    
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to change password'
      }
    });
  }
});

// ===== ADMIN ENDPOINTS =====

// Get all users (admin only)
router.get('/admin/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const users = await User.find(query)
      .populate('approved_by', 'full_name')
      .sort({ created_at: -1 })
      .lean();
    
    // Transform data to match expected format
    const transformedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      approved_at: user.approved_at,
      last_login: user.last_login,
      approved_by_name: user.approved_by?.full_name || null
    }));
    
    res.json({
      success: true,
      data: { users: transformedUsers }
    });
  } catch (error) {
    logger.error('Admin users endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Approve/reject user (admin only)
router.put('/admin/users/:id/approve', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "approve" or "reject"'
        }
      });
    }
    
    // Find user that is pending approval
    const user = await User.findOne({ _id: id, status: 'pending' });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or not pending approval'
        }
      });
    }
    
    // Update user status
    if (action === 'approve') {
      await user.approve(req.user.id);
    } else {
      await user.reject(req.user.id);
    }
    
    logger.info(`User ${action}d: ID ${id} by admin ${req.user.email}`);
    
    res.json({
      success: true,
      data: {
        message: `User ${action}d successfully`,
        userId: id,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('User approval endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Get analytics data (admin only)
router.get('/admin/analytics', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const analyticsData = await getAnalyticsData(timeframe);
    const userManagementData = await getUserManagementData();
    
    res.json({
      success: true,
      data: {
        ...analyticsData,
        ...userManagementData,
        timeframe
      }
    });
  } catch (error) {
    logger.error('Analytics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to fetch analytics data'
      }
    });
  }
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
    
    // If no AI APIs available, return error instead of mock data
    logger.warn('No AI API keys configured, cannot provide analysis');
    throw new Error('No Data - Possible Error. AI analysis services are not configured.');
    
  } catch (error) {
    logger.error('AI analysis failed:', error);
    throw new Error(`No Data - Possible Error. ${error.message}`);
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
      adsData: providedAdsData, // New: accept ads data directly from frontend
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

    // Priority 1: Use provided ads data directly from frontend (new approach)
    if (providedAdsData && Array.isArray(providedAdsData) && providedAdsData.length > 0) {
      adsData = providedAdsData;
      logger.info('Using provided ads data from frontend', {
        adsCount: adsData.length,
        advertisers: [...new Set(adsData.map(ad => ad.advertiser_name))],
        hasVideoTranscripts: adsData.some(ad => ad.creative?.video_transcripts?.length > 0)
      });
    }
    // Priority 2: Get ads data from workflow (legacy approach)
    else if (workflowId && workflowId.trim()) {
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
    }
    // Support general questions without requiring workflow data
    // adsData will be empty array for general questions

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

    // Try OpenAI if Ollama failed or not available
    if (!analysisResult) {
      try {
        if (process.env.OPENAI_API_KEY) {
          const openaiResult = await callOpenAIForAnalysis(prompt, adsWithTranscripts, filters);
          analysisResult = {
            analysis: openaiResult.analysis,
            metadata: openaiResult.metadata
          };
          aiProvider = 'openai';
        }
      } catch (openaiError) {
        logger.warn('OpenAI analysis failed, trying Claude...', openaiError.message);
      }
    }

    // Try Claude if OpenAI failed or not available
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

    // No fallback to mock data - return error if all AI providers fail
    if (!analysisResult) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'No Data - Possible Error. All AI analysis services are currently unavailable.'
        }
      });
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
    const { videos, prompt, templates, customPrompt, options = {}, workflowId } = req.body;
    
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
    
    // Build the final prompt from templates or custom prompt
    let finalPrompt = '';
    if (customPrompt && customPrompt.trim()) {
      finalPrompt = customPrompt.trim();
    } else if (templates && Array.isArray(templates) && templates.length > 0) {
      // Build prompt from selected templates
      finalPrompt = templates.map(template => template.prompt).join('\n\n');
    } else if (prompt && typeof prompt === 'string' && prompt.trim()) {
      // Fallback to direct prompt parameter (for legacy compatibility)
      finalPrompt = prompt.trim();
    }
    
    if (!finalPrompt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Analysis prompt, templates, or customPrompt is required',
          details: { prompt, templates, customPrompt }
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
      prompt: finalPrompt,
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
    logger.info(`About to start processBulkVideoAnalysis for jobId: ${jobId}`);
    setImmediate(() => {
      logger.info(`Starting processBulkVideoAnalysis for jobId: ${jobId}`);
      processBulkVideoAnalysis(jobId).catch(error => {
        logger.error(`Unhandled error in processBulkVideoAnalysis for jobId ${jobId}:`, error);
        // Update job with error if it fails completely
        const job = jobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.completed_at = new Date().toISOString();
          job.error = `Processing failed: ${error.message}`;
          job.progress.stage = 'failed';
          job.progress.message = `Analysis failed: ${error.message}`;
          jobs.set(jobId, job);
        }
      });
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
      adsData: providedAdsData, // New: accept ads data directly from frontend
      brandsAnalyzed,
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
    
    // Priority 1: Use provided ads data directly from frontend (new approach)
    if (providedAdsData && Array.isArray(providedAdsData) && providedAdsData.length > 0) {
      adsData = providedAdsData;
      contextPrompt = buildGeneralChatPrompt(message, adsData, brandsAnalyzed);
      logger.info('Chat using provided ads data from frontend', {
        adsCount: adsData.length,
        brands: brandsAnalyzed || []
      });
    }
    // Priority 2: Use workflow data (legacy approach)
    else if (workflowId && workflowId.trim()) {
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

    // No fallback to mock data - return error if all AI providers fail
    if (!chatResult) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'No Data - Possible Error. All AI chat services are currently unavailable.'
        }
      });
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

// Helper function to build general chat prompt with real ad data
function buildGeneralChatPrompt(userMessage, adsData, brandsAnalyzed) {
  let contextText = `You are an AI assistant helping with Facebook advertising competitive analysis. `;
  
  // Include real ad data context when available
  if (adsData && adsData.length > 0) {
    contextText += `You have access to real advertising data to provide specific, contextual responses.

**Analysis Context:**
- Total ads analyzed: ${adsData.length}
- Brands analyzed: ${brandsAnalyzed ? brandsAnalyzed.join(', ') : 'Multiple brands'}

**Sample Ad Data:**`;
    
    // Include first few ads for context (limit to avoid token limits)
    const sampleAds = adsData.slice(0, 5);
    sampleAds.forEach((ad, index) => {
      contextText += `\n\nAd ${index + 1}:`;
      contextText += `\n- Advertiser: ${ad.advertiser_name}`;
      contextText += `\n- Content: ${ad.ad_creative_body || ad.ad_text || 'No text available'}`;
      if (ad.creative?.has_video) {
        contextText += `\n- Format: Video ad`;
        if (ad.creative.video_transcripts?.length > 0) {
          contextText += `\n- Video content: ${ad.creative.video_transcripts.join(' ').substring(0, 200)}...`;
        }
      } else {
        contextText += `\n- Format: Image ad`;
      }
    });
    
    contextText += `\n\n**User Question:** ${userMessage}

Please provide a specific, data-driven response based on the actual advertising content shown above. Reference specific brands, messaging themes, or creative strategies when relevant.`;
  } else {
    contextText += `Please answer the user's question based on Facebook advertising best practices.

**User Question:** ${userMessage}

Please provide a helpful response about Facebook advertising strategy.`;
  }
  
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

// OpenAI analysis function for custom analysis prompts
async function callOpenAIForAnalysis(prompt, adsData, filters) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('Starting OpenAI custom analysis');

    const systemPrompt = `You are an AI assistant specialized in Facebook advertising competitive analysis. Analyze the provided ad data and answer the user's custom analysis prompt.

Your responses should be:
- Detailed and comprehensive
- Based on the actual ad data provided
- Structured with clear sections and insights
- Actionable and strategic
- Professional and analytical

Format your response with proper markdown formatting including headers, bullet points, and emphasis where appropriate.`;

    // Build context from ads data
    let contextData = '';
    if (adsData && adsData.length > 0) {
      contextData = `\n\nAd Data Analysis Context:\n`;
      contextData += `Total ads analyzed: ${adsData.length}\n\n`;
      
      // Sample some ads for context (limit to avoid token limits)
      const sampleAds = adsData.slice(0, 10);
      sampleAds.forEach((ad, index) => {
        contextData += `Ad ${index + 1}:\n`;
        contextData += `- Advertiser: ${ad.advertiser_name || 'Unknown'}\n`;
        contextData += `- Text: ${ad.ad_creative_body || ad.ad_text || 'No text'}\n`;
        if (ad.creative && ad.creative.image_url) {
          contextData += `- Has Image: Yes\n`;
        }
        if (ad.creative && ad.creative.video_transcripts) {
          contextData += `- Video Transcript: ${ad.creative.video_transcripts.join(' ')}\n`;
        }
        contextData += '\n';
      });
    } else {
      contextData = '\n\nNo specific ad data provided. Please provide a general analysis based on Facebook advertising best practices.\n';
    }

    const fullPrompt = `${prompt}${contextData}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = {
      analysis: response.choices[0].message.content,
      metadata: {
        model: 'gpt-4',
        tokens_used: response.usage?.total_tokens || 0,
        ai_provider: 'openai',
        timestamp: new Date().toISOString()
      }
    };

    logger.info('OpenAI custom analysis completed', {
      tokensUsed: response.usage?.total_tokens,
      responseLength: result.analysis.length,
      adsAnalyzed: adsData.length
    });

    return result;

  } catch (error) {
    logger.error('OpenAI custom analysis failed:', error);
    throw new Error(`OpenAI analysis failed: ${error.message}`);
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

// Process bulk video analysis with real AI analysis using OpenAI
async function processBulkVideoAnalysis(jobId) {
  logger.info(`Processing bulk video analysis with jobId: ${jobId}`);
  
  const job = jobs.get(jobId);
  if (!job) {
    logger.error(`Job ${jobId} not found in processBulkVideoAnalysis`);
    return;
  }
  
  logger.info(`Job found successfully:`, {
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
    
    logger.info(`Processing bulk video analysis ${jobId}`, {
      videoCount: job.videos.length,
      competitorName: job.options.competitorName
    });

    // Stage 1: Preparation
    job.progress.current = 1;
    job.progress.percentage = 10;
    job.progress.message = 'Preparing video data for analysis...';
    jobs.set(jobId, job);
    
    logger.info(`Stage 1: Preparation completed for job ${jobId}`);
    
    const competitorName = job.options.competitorName || 'Competitor';
    const analysisType = job.options.analysisType || 'custom';
    
    logger.info(`Extracted job parameters for ${jobId}:`, {
      competitorName,
      analysisType,
      videoCount: job.videos.length
    });
    
    // Stage 2: Build analysis prompt with real video data
    job.progress.stage = 'analyzing';
    job.progress.message = 'Analyzing video content with AI...';
    job.progress.percentage = 30;
    jobs.set(jobId, job);
    
    // Create detailed video data context (limit to avoid token limits)
    const maxVideos = Math.min(job.videos.length, 15); // Limit to 15 videos max
    const videosToAnalyze = job.videos.slice(0, maxVideos);
    
    let videoDataContext = `Analyze ${videosToAnalyze.length} video advertisements from ${competitorName} (showing first ${maxVideos} of ${job.videos.length} total videos).\n\n**VIDEO DATA:**\n`;
    
    videosToAnalyze.forEach((video, index) => {
      videoDataContext += `\nVideo ${index + 1}:\n`;
      videoDataContext += `- Brand: ${video.brand || competitorName}\n`;
      // Limit ad text to 200 characters to reduce tokens
      const adText = (video.text || 'No text content').substring(0, 200);
      videoDataContext += `- Ad Text: ${adText}${video.text && video.text.length > 200 ? '...' : ''}\n`;
      if (video.date) {
        videoDataContext += `- Date: ${video.date}\n`;
      }
      // Skip URLs to save tokens
      videoDataContext += `- Facebook Ad ID: ${video.id || 'N/A'}\n`;
    });
    
    // Build the analysis request based on custom prompt or selected template
    let analysisPrompt;
    if (job.prompt && job.prompt.trim()) {
      // Custom prompt provided
      analysisPrompt = `${videoDataContext}\n\n**ANALYSIS REQUEST:**\n${job.prompt}\n\nPlease provide a comprehensive analysis based on the above video data and the specific request.`;
    } else {
      // Default comprehensive analysis
      analysisPrompt = `${videoDataContext}\n\n**ANALYSIS REQUEST:**\nProvide a comprehensive competitive analysis of these ${job.videos.length} video advertisements from ${competitorName}. Include:\n\n1. **Content Strategy Analysis**: What messaging themes, value propositions, and storytelling techniques are used?\n2. **Creative Approach**: What visual styles, formats, and creative elements are prevalent?\n3. **Competitive Intelligence**: What market positioning and strategic advantages are showcased?\n4. **Strategic Recommendations**: What opportunities exist for differentiation and competitive advantage?\n\nFocus on specific insights from the actual video data provided, not generic advice.`;
    }
    
    // Update progress after building prompt
    job.progress.current = 5;
    job.progress.percentage = 25;
    job.progress.message = 'Analysis prompt prepared, calling AI service...';
    jobs.set(jobId, job);
    
    logger.info(`Analysis prompt built for job ${jobId}`, {
      promptLength: analysisPrompt.length,
      videosAnalyzed: videosToAnalyze.length
    });
    
    // Stage 3: Call OpenAI for analysis
    job.progress.percentage = 50;
    job.progress.message = 'Running AI analysis...';
    jobs.set(jobId, job);
    
    logger.info(`Starting OpenAI analysis for job ${jobId}`, {
      promptLength: analysisPrompt.length,
      videoCount: job.videos.length,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    });
    
    let aiAnalysis;
    try {
      aiAnalysis = await analyzeWithOpenAI(analysisPrompt, { videos: job.videos });
      logger.info(`OpenAI analysis completed for job ${jobId}`, {
        responseLength: aiAnalysis ? aiAnalysis.length : 0
      });
    } catch (aiError) {
      logger.error(`OpenAI analysis failed for job ${jobId}:`, aiError);
      throw new Error(`AI analysis failed: ${aiError.message}`);
    }
    
    // Stage 4: Process results
    job.progress.percentage = 90;
    job.progress.message = 'Processing analysis results...';
    jobs.set(jobId, job);
    
    // Parse the AI response to extract structured data
    let summary = '';
    let analysis = '';
    let recommendations = '';
    
    if (aiAnalysis) {
      const sections = aiAnalysis.split(/\*\*.*?RECOMMENDATIONS.*?\*\*/i);
      if (sections.length >= 2) {
        const beforeRecommendations = sections[0];
        recommendations = sections[1].trim();
        
        const summaryMatch = beforeRecommendations.match(/\*\*.*?SUMMARY.*?\*\*([\s\S]*?)(?=\*\*|$)/i);
        const analysisMatch = beforeRecommendations.match(/\*\*.*?ANALYSIS.*?\*\*([\s\S]*?)(?=\*\*|$)/i);
        
        summary = summaryMatch ? summaryMatch[1].trim() : beforeRecommendations.substring(0, 500).trim();
        analysis = analysisMatch ? analysisMatch[1].trim() : beforeRecommendations.substring(500).trim();
      } else {
        // Fallback: use first part as summary, rest as analysis
        const parts = aiAnalysis.split('\n\n');
        summary = parts[0] || '';
        analysis = parts.slice(1).join('\n\n') || aiAnalysis;
      }
    }
    
    // Structure the final results
    const finalResults = {
      summary: summary || 'Analysis completed for video content.',
      analysis: analysis || aiAnalysis || 'Detailed analysis not available.',
      recommendations: recommendations || 'Strategic recommendations not available.',
      raw_analysis: aiAnalysis, // Include full AI response for debugging
      metadata: {
        ai_provider: 'openai_gpt4',
        total_videos: job.videos.length,
        analysis_type: analysisType,
        competitor_name: competitorName,
        include_transcripts: job.options.includeTranscripts,
        include_visual_analysis: job.options.includeVisualAnalysis,
        prompt_used: job.prompt,
        generated_at: new Date().toISOString(),
        note: 'Real AI analysis based on actual scraped video data from Facebook Ad Library.'
      }
    };
    
    // Complete the job
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.results = finalResults;
    job.progress.stage = 'completed';
    job.progress.message = 'Video analysis completed successfully!';
    job.progress.percentage = 100;
    job.progress.current = job.videos.length;
    jobs.set(jobId, job);
    
    logger.info(`Bulk video analysis ${jobId} completed successfully`, {
      videoCount: job.videos.length,
      analysisLength: aiAnalysis ? aiAnalysis.length : 0,
      duration: new Date() - new Date(job.started_at)
    });
    
  } catch (error) {
    logger.error(`Bulk video analysis ${jobId} failed:`, error);
    logger.error(`Error details:`, {
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
    job.progress.message = `Video analysis failed: ${error.message}`;
    jobs.set(jobId, job);
  }
}

module.exports = router;
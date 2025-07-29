const logger = require('../utils/logger');

// Import MongoDB models
const SiteAnalytics = require('../models/SiteAnalytics');
const UserActivityLog = require('../models/UserActivityLog');
const User = require('../models/User');

// Track page visit
const trackPageVisit = async (userId, pagePath, req) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'] || '';
    
    const analytics = new SiteAnalytics({
      user_id: userId,
      page_path: pagePath,
      action_type: 'page_visit',
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    const savedAnalytics = await analytics.save();
    return savedAnalytics._id;
  } catch (error) {
    logger.error('Failed to track page visit:', error);
    throw error;
  }
};

// Track user action
const trackUserAction = async (userId, action, details = null, metadata = {}) => {
  try {
    const activityLog = await UserActivityLog.logActivity(userId, action, details, metadata);
    return activityLog._id;
  } catch (error) {
    logger.error('Failed to track user action:', error);
    throw error;
  }
};

// Analytics middleware for automatic page visit tracking
const analyticsMiddleware = async (req, res, next) => {
  // Track page visits for GET requests to main routes
  if (req.method === 'GET' && req.user && shouldTrackPath(req.path)) {
    try {
      await trackPageVisit(req.user.id, req.path, req);
    } catch (error) {
      // Don't fail the request if analytics tracking fails
      logger.error('Analytics tracking failed:', error);
    }
  }
  
  // Add analytics helper functions to request object
  req.analytics = {
    trackAction: async (action, details = null) => {
      if (req.user) {
        try {
          await trackUserAction(req.user.id, action, details);
        } catch (error) {
          logger.error('Action tracking failed:', error);
        }
      }
    }
  };
  
  next();
};

// Determine if a path should be tracked
const shouldTrackPath = (path) => {
  // Don't track API calls, assets, or health checks
  const skipPaths = [
    '/api/',
    '/assets/',
    '/health',
    '/favicon.ico',
    '/.well-known/'
  ];
  
  return !skipPaths.some(skipPath => path.startsWith(skipPath));
};

// Get analytics data for admin dashboard
const getAnalyticsData = async (timeframe = '30d') => {
  try {
    const [pageStats, dailyStats, activityStats, totalStats] = await Promise.all([
      SiteAnalytics.getPageStats(timeframe),
      SiteAnalytics.getDailyStats(timeframe),
      SiteAnalytics.getActivityStats(timeframe),
      SiteAnalytics.getTotalStats(timeframe)
    ]);
    
    return {
      pageStats,
      dailyStats,
      activityStats,
      totalStats
    };
  } catch (error) {
    logger.error('Failed to get analytics data:', error);
    throw error;
  }
};

// Get user management data
const getUserManagementData = async () => {
  try {
    // Get user counts by status
    const statusCounts = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    // Get recent registrations
    const recentUsers = await User.find()
      .select('email full_name status created_at approved_at last_login')
      .sort({ created_at: -1 })
      .limit(20)
      .lean();
    
    // Get pending approvals
    const pendingUsers = await User.find({ status: 'pending' })
      .select('email full_name created_at')
      .sort({ created_at: 1 })
      .lean();
    
    return {
      statusCounts,
      recentUsers,
      pendingUsers
    };
  } catch (error) {
    logger.error('Failed to get user management data:', error);
    throw error;
  }
};

module.exports = {
  trackPageVisit,
  trackUserAction,
  analyticsMiddleware,
  getAnalyticsData,
  getUserManagementData
};
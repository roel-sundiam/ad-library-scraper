const mongoose = require('mongoose');

const siteAnalyticsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Allow anonymous tracking
  },
  page_path: {
    type: String,
    required: true,
    trim: true
  },
  action_type: {
    type: String,
    required: true,
    enum: [
      'page_visit',
      'login',
      'logout',
      'analysis_started',
      'analysis_completed',
      'scraping_started',
      'scraping_completed',
      'export_generated',
      'user_registered',
      'user_approved'
    ]
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  },
  session_id: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for efficient queries
siteAnalyticsSchema.index({ user_id: 1, timestamp: -1 });
siteAnalyticsSchema.index({ page_path: 1, timestamp: -1 });
siteAnalyticsSchema.index({ action_type: 1, timestamp: -1 });
siteAnalyticsSchema.index({ timestamp: -1 });

// TTL index to automatically remove old analytics data after 1 year
siteAnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to get page stats
siteAnalyticsSchema.statics.getPageStats = function(timeframe = '30d', limit = 10) {
  const startDate = this.getStartDate(timeframe);
  
  return this.aggregate([
    {
      $match: {
        action_type: 'page_visit',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$page_path',
        visits: { $sum: 1 },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    {
      $project: {
        page_path: '$_id',
        visits: 1,
        unique_users: { $size: '$unique_users' },
        _id: 0
      }
    },
    { $sort: { visits: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get daily stats
siteAnalyticsSchema.statics.getDailyStats = function(timeframe = '30d') {
  const startDate = this.getStartDate(timeframe);
  
  return this.aggregate([
    {
      $match: {
        action_type: 'page_visit',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        },
        visits: { $sum: 1 },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    {
      $project: {
        date: '$_id',
        visits: 1,
        unique_users: { $size: '$unique_users' },
        _id: 0
      }
    },
    { $sort: { date: -1 } }
  ]);
};

// Static method to get activity stats
siteAnalyticsSchema.statics.getActivityStats = function(timeframe = '30d', limit = 10) {
  const startDate = this.getStartDate(timeframe);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action_type',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get total stats
siteAnalyticsSchema.statics.getTotalStats = function(timeframe = '30d') {
  const startDate = this.getStartDate(timeframe);
  
  return this.aggregate([
    {
      $match: {
        action_type: 'page_visit',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total_page_visits: { $sum: 1 },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    {
      $project: {
        total_page_visits: 1,
        total_active_users: { $size: '$unique_users' },
        _id: 0
      }
    }
  ]).then(results => results[0] || { total_page_visits: 0, total_active_users: 0 });
};

// Helper method to get start date based on timeframe
siteAnalyticsSchema.statics.getStartDate = function(timeframe) {
  const now = new Date();
  
  switch (timeframe) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

module.exports = mongoose.model('SiteAnalytics', siteAnalyticsSchema);
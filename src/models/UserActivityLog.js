const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
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

// Indexes for performance
userActivityLogSchema.index({ user_id: 1, timestamp: -1 });
userActivityLogSchema.index({ action: 1, timestamp: -1 });
userActivityLogSchema.index({ timestamp: -1 });

// TTL index to automatically remove old activity logs after 6 months
userActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// Static method to log user activity
userActivityLogSchema.statics.logActivity = function(userId, action, details = null, metadata = {}) {
  return this.create({
    user_id: userId,
    action,
    details,
    ip_address: metadata.ip_address,
    user_agent: metadata.user_agent
  });
};

// Static method to get user activity history
userActivityLogSchema.statics.getUserActivity = function(userId, limit = 50) {
  return this.find({ user_id: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user_id', 'full_name email');
};

// Static method to get activity stats
userActivityLogSchema.statics.getActivityStats = function(timeframe = '30d') {
  const startDate = this.getStartDate(timeframe);
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        unique_users: { $size: '$unique_users' },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Helper method to get start date based on timeframe
userActivityLogSchema.statics.getStartDate = function(timeframe) {
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

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);
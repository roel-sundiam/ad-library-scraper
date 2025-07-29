const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token_hash: {
    type: String,
    required: true,
    unique: true
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
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
userSessionSchema.index({ user_id: 1 });
userSessionSchema.index({ token_hash: 1 });
userSessionSchema.index({ expires_at: 1 });

// Static method to clean expired sessions
userSessionSchema.statics.cleanExpired = function() {
  return this.deleteMany({ expires_at: { $lte: new Date() } });
};

// Static method to find valid session
userSessionSchema.statics.findValidSession = function(userId, tokenHash) {
  return this.findOne({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: { $gt: new Date() }
  }).populate('user_id');
};

module.exports = mongoose.model('UserSession', userSessionSchema);
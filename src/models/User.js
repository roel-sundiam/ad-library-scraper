const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password_hash: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved_at: {
    type: Date,
    default: null
  },
  last_login: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password_hash; // Never expose password hash
      return ret;
    }
  }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ created_at: -1 });

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to check if user is approved
userSchema.methods.isApproved = function() {
  return this.status === 'approved';
};

// Instance method to approve user
userSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approved_by = approvedBy;
  this.approved_at = new Date();
  return this.save();
};

// Instance method to reject user
userSchema.methods.reject = function(approvedBy) {
  this.status = 'rejected';
  this.approved_by = approvedBy;
  this.approved_at = new Date();
  return this.save();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.last_login = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
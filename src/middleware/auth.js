const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// Import MongoDB models
const User = require('../models/User');
const UserSession = require('../models/UserSession');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = 12;

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ad-library-scraper',
    audience: 'ad-library-users'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'ad-library-scraper',
      audience: 'ad-library-users'
    });
  } catch (error) {
    logger.error('JWT verification failed:', error.message);
    return null;
  }
};

// Hash password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
};

// Compare password
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Password comparison failed:', error);
    throw new Error('Password comparison failed');
  }
};

// Store session token in database
const storeSession = async (userId, tokenHash, metadata = {}) => {
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const session = new UserSession({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent
    });
    
    const savedSession = await session.save();
    return savedSession._id;
  } catch (error) {
    logger.error('Failed to store session:', error);
    throw error;
  }
};

// Remove session token from database
const removeSession = async (userId, tokenHash) => {
  try {
    const result = await UserSession.deleteOne({
      user_id: userId,
      token_hash: tokenHash
    });
    
    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to remove session:', error);
    throw error;
  }
};

// Clean expired sessions
const cleanExpiredSessions = async () => {
  try {
    const result = await UserSession.cleanExpired();
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned ${result.deletedCount} expired sessions`);
    }
    
    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to clean expired sessions:', error);
    throw error;
  }
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Access token is required'
      }
    });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
  
  try {
    // Clean expired sessions periodically
    await cleanExpiredSessions();
    
    // Verify session exists in database
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    const session = await UserSession.findValidSession(decoded.id, tokenHash);
    
    if (!session) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session not found or expired'
        }
      });
    }
    
    if (session.user_id.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_NOT_APPROVED',
          message: 'User account is not approved'
        }
      });
    }
    
    // Add user info to request
    req.user = {
      id: session.user_id._id,
      email: session.user_id.email,
      role: session.user_id.role,
      status: session.user_id.status,
      full_name: session.user_id.full_name
    };
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

// Role-based authorization middleware
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }
    
    if (req.user.role !== requiredRole && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PRIVILEGES',
          message: `${requiredRole} role required`
        }
      });
    }
    
    next();
  };
};

// Super admin check middleware
const requireSuperAdmin = requireRole('super_admin');

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  storeSession,
  removeSession,
  cleanExpiredSessions,
  authenticateToken,
  requireRole,
  requireSuperAdmin
};
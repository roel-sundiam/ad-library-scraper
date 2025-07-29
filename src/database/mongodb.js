const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection URI - you can configure this via environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ad-library-scraper';

// Connection options for production-ready setup
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  writeConcern: {
    w: 'majority'
  }
};

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return;
  }

  try {
    logger.info('Connecting to MongoDB...');
    
    const conn = await mongoose.connect(MONGODB_URI, connectionOptions);
    
    isConnected = true;
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};

const getConnectionStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
};

// Initialize indexes and any required setup
const initializeDatabase = async () => {
  try {
    // Import models to ensure they're registered
    require('../models/User');
    require('../models/UserSession');
    require('../models/SiteAnalytics');
    require('../models/UserActivityLog');
    
    logger.info('Database models initialized successfully');
    
    // You can add any additional database setup here
    // For example, creating initial data, ensuring indexes, etc.
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  initializeDatabase,
  isConnected: () => isConnected
};
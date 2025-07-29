const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || './data/ads.db';

let db = null;

const initialize = async () => {
  return new Promise((resolve, reject) => {
    const dbDir = path.dirname(DB_PATH);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      logger.info('Connected to SQLite database');
      createTables()
        .then(resolve)
        .catch(reject);
    });
  });
};

const createTables = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Advertisers table
      db.run(`CREATE TABLE IF NOT EXISTS advertisers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id TEXT UNIQUE,
        page_name TEXT,
        platform TEXT,
        verified BOOLEAN DEFAULT FALSE,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) logger.error('Error creating advertisers table:', err);
      });

      // Ads table
      db.run(`CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_id TEXT UNIQUE,
        advertiser_id INTEGER,
        platform TEXT,
        ad_creative_body TEXT,
        ad_creative_link_caption TEXT,
        ad_creative_link_description TEXT,
        ad_creative_link_title TEXT,
        ad_snapshot_url TEXT,
        currency TEXT,
        delivery_by_region TEXT,
        demographic_distribution TEXT,
        impressions_min INTEGER,
        impressions_max INTEGER,
        spend_min INTEGER,
        spend_max INTEGER,
        ad_creation_time DATETIME,
        ad_delivery_start_time DATETIME,
        ad_delivery_stop_time DATETIME,
        page_id TEXT,
        page_name TEXT,
        publisher_platforms TEXT,
        estimated_audience_size INTEGER,
        languages TEXT,
        regions TEXT,
        age_country_gender_reach_breakdown TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (advertiser_id) REFERENCES advertisers (id)
      )`, (err) => {
        if (err) logger.error('Error creating ads table:', err);
      });

      // Ad creatives table (for images, videos, etc.)
      db.run(`CREATE TABLE IF NOT EXISTS ad_creatives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_id TEXT,
        creative_type TEXT,
        creative_url TEXT,
        creative_body TEXT,
        image_hash TEXT,
        video_preview_image_url TEXT,
        video_sd_url TEXT,
        video_hd_url TEXT,
        link_url TEXT,
        call_to_action_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ad_id) REFERENCES ads (ad_id)
      )`, (err) => {
        if (err) logger.error('Error creating ad_creatives table:', err);
      });

      // Scraping sessions table
      db.run(`CREATE TABLE IF NOT EXISTS scraping_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT,
        search_query TEXT,
        total_ads_found INTEGER DEFAULT 0,
        status TEXT DEFAULT 'running',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        error_message TEXT
      )`, (err) => {
        if (err) logger.error('Error creating scraping_sessions table:', err);
      });

      // Users table for authentication
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        approved_by INTEGER,
        last_login DATETIME,
        FOREIGN KEY (approved_by) REFERENCES users (id)
      )`, (err) => {
        if (err) logger.error('Error creating users table:', err);
      });

      // User sessions table for JWT token management
      db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) logger.error('Error creating user_sessions table:', err);
      });

      // Site analytics table for tracking page visits and user activity
      db.run(`CREATE TABLE IF NOT EXISTS site_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        page_path TEXT NOT NULL,
        action_type TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) logger.error('Error creating site_analytics table:', err);
      });

      // User activity logs table for detailed action tracking
      db.run(`CREATE TABLE IF NOT EXISTS user_activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          logger.error('Error creating user_activity_logs table:', err);
          reject(err);
        } else {
          logger.info('Database tables created successfully');
          resolve();
        }
      });

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads(platform)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ads_page_id ON ads(page_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_ads_creation_time ON ads(ad_creation_time)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_advertisers_platform ON advertisers(platform)`);
      
      // Authentication and analytics indexes
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_site_analytics_user_id ON site_analytics(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_site_analytics_timestamp ON site_analytics(timestamp)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp)`);
    });
  });
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
};

const closeDatabase = () => {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initialize,
  getDatabase,
  closeDatabase
};
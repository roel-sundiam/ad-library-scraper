#!/usr/bin/env node

/**
 * Script to create the first super admin user
 * Usage: node scripts/create-super-admin.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initialize, getDatabase } = require('../src/database/init');
const { hashPassword } = require('../src/middleware/auth');
const logger = require('../src/utils/logger');

const createSuperAdmin = async () => {
  try {
    console.log('🚀 Initializing database...');
    await initialize();
    
    const db = getDatabase();
    
    // Check if super admin already exists
    db.get(
      'SELECT id FROM users WHERE role = ?',
      ['super_admin'],
      async (err, existingAdmin) => {
        if (err) {
          logger.error('Database error:', err);
          process.exit(1);
        }
        
        if (existingAdmin) {
          console.log('⚠️  Super admin already exists. Exiting...');
          process.exit(0);
        }
        
        // Prompt for admin details
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        console.log('\n📝 Creating super admin account...\n');
        
        rl.question('Email: ', (email) => {
          if (!email || !email.includes('@')) {
            console.log('❌ Please provide a valid email address');
            rl.close();
            process.exit(1);
          }
          
          rl.question('Full Name: ', (fullName) => {
            if (!fullName) {
              console.log('❌ Please provide a full name');
              rl.close();
              process.exit(1);
            }
            
            rl.question('Password (min 8 characters): ', (password) => {
              if (!password || password.length < 8) {
                console.log('❌ Password must be at least 8 characters long');
                rl.close();
                process.exit(1);
              }
              
              rl.close();
              
              // Create the super admin
              createAdminUser(email.toLowerCase(), fullName, password);
            });
          });
        });
      }
    );
  } catch (error) {
    logger.error('Initialization error:', error);
    process.exit(1);
  }
};

const createAdminUser = async (email, fullName, password) => {
  try {
    const db = getDatabase();
    
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(password);
    
    // Create super admin user
    db.run(
      `INSERT INTO users (email, password_hash, full_name, role, status, approved_at) 
       VALUES (?, ?, ?, 'super_admin', 'approved', CURRENT_TIMESTAMP)`,
      [email, passwordHash, fullName],
      function(err) {
        if (err) {
          logger.error('Failed to create super admin:', err);
          console.log('❌ Failed to create super admin user');
          process.exit(1);
        }
        
        console.log('\n✅ Super admin created successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`👤 Name: ${fullName}`);
        console.log(`🆔 User ID: ${this.lastID}`);
        console.log(`🔑 Role: super_admin`);
        console.log(`✅ Status: approved\n`);
        
        console.log('🚀 You can now login to the application with these credentials.');
        console.log('💡 Make sure to change the password after first login.\n');
        
        logger.info(`Super admin created: ${email} (ID: ${this.lastID})`);
        process.exit(0);
      }
    );
  } catch (error) {
    logger.error('Super admin creation error:', error);
    console.log('❌ Failed to create super admin user');
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createSuperAdmin();
}

module.exports = { createSuperAdmin };
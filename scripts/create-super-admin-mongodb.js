#!/usr/bin/env node

/**
 * Script to create the first super admin user with MongoDB
 * Usage: node scripts/create-super-admin-mongodb.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectDB, initializeDatabase } = require('../src/database/mongodb');
const { hashPassword } = require('../src/middleware/auth');
const User = require('../src/models/User');
const logger = require('../src/utils/logger');

const createSuperAdmin = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await connectDB();
    await initializeDatabase();
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingAdmin) {
      console.log('⚠️  Super admin already exists. Exiting...');
      console.log(`📧 Existing admin: ${existingAdmin.email}`);
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
  } catch (error) {
    logger.error('Initialization error:', error);
    console.log('❌ Failed to connect to MongoDB');
    process.exit(1);
  }
};

const createAdminUser = async (email, fullName, password) => {
  try {
    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(password);
    
    // Create super admin user
    const superAdmin = new User({
      email,
      password_hash: passwordHash,
      full_name: fullName,
      role: 'super_admin',
      status: 'approved',
      approved_at: new Date()
    });
    
    const savedAdmin = await superAdmin.save();
    
    console.log('\n✅ Super admin created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${fullName}`);
    console.log(`🆔 User ID: ${savedAdmin._id}`);
    console.log(`🔑 Role: super_admin`);
    console.log(`✅ Status: approved\n`);
    
    console.log('🚀 You can now login to the application with these credentials.');
    console.log('💡 Make sure to change the password after first login.\n');
    
    logger.info(`Super admin created: ${email} (ID: ${savedAdmin._id})`);
    process.exit(0);
  } catch (error) {
    logger.error('Super admin creation error:', error);
    console.log('❌ Failed to create super admin user');
    
    if (error.code === 11000) {
      console.log('📧 A user with this email already exists');
    }
    
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
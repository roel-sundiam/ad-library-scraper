#!/usr/bin/env node

/**
 * Script to create a default super admin user
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, initializeDatabase } = require('./src/database/mongodb');
const { hashPassword } = require('./src/middleware/auth');
const User = require('./src/models/User');
const logger = require('./src/utils/logger');

const createDefaultSuperAdmin = async () => {
  try {
    console.log('🚀 Creating default super admin...');
    await connectDB();
    await initializeDatabase();
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingAdmin) {
      console.log('⚠️  Super admin already exists.');
      console.log(`📧 Existing admin email: ${existingAdmin.email}`);
      process.exit(0);
    }
    
    // Default admin credentials
    const email = 'admin@scrapeiq.com';
    const password = 'Admin123!';
    const fullName = 'ScrapeIQ Administrator';
    
    // Hash password
    console.log('🔐 Creating admin account...');
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
    
    console.log('\n✅ Default super admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${fullName}`);
    console.log(`🆔 User ID: ${savedAdmin._id}`);
    console.log(`🔐 Role: super_admin`);
    console.log(`✅ Status: approved`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login with these credentials!');
    console.log('💡 Please change the password after first login.\n');
    
    logger.info(`Default super admin created: ${email} (ID: ${savedAdmin._id})`);
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

// Run the script
createDefaultSuperAdmin();
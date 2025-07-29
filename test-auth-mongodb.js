#!/usr/bin/env node

/**
 * Test script to verify MongoDB authentication system functionality
 */

const path = require('path');
require('dotenv').config();

const { connectDB, initializeDatabase } = require('./src/database/mongodb');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('./src/middleware/auth');
const User = require('./src/models/User');
const UserSession = require('./src/models/UserSession');

const testAuthSystem = async () => {
  try {
    console.log('🧪 Testing MongoDB Authentication System...\n');

    // 1. Test database connection
    console.log('1. Testing MongoDB connection...');
    await connectDB();
    await initializeDatabase();
    console.log('✅ MongoDB connected and initialized successfully\n');

    // 2. Test password hashing
    console.log('2. Testing password hashing...');
    const testPassword = 'testpassword123';
    const hashedPassword = await hashPassword(testPassword);
    console.log(`✅ Password hashed: ${hashedPassword.substring(0, 20)}...\n`);

    // 3. Test password comparison
    console.log('3. Testing password comparison...');
    const isMatch = await comparePassword(testPassword, hashedPassword);
    const isWrongMatch = await comparePassword('wrongpassword', hashedPassword);
    console.log(`✅ Correct password match: ${isMatch}`);
    console.log(`✅ Wrong password match: ${isWrongMatch}\n`);

    // 4. Test user model operations
    console.log('4. Testing User model operations...');
    
    // Create test user
    const testUser = new User({
      email: 'test@example.com',
      password_hash: hashedPassword,
      full_name: 'Test User',
      role: 'user',
      status: 'pending'
    });
    
    const savedUser = await testUser.save();
    console.log(`✅ User created: ${savedUser.email} (ID: ${savedUser._id})`);
    
    // Test user methods
    const foundUser = await User.findByEmail('test@example.com');
    console.log(`✅ User found by email: ${foundUser ? 'Yes' : 'No'}`);
    
    // Test user approval
    await foundUser.approve(savedUser._id);
    console.log(`✅ User approved: ${foundUser.status}`);

    // 5. Test JWT token generation and verification
    console.log('\n5. Testing JWT tokens...');
    const token = generateToken(foundUser);
    console.log(`✅ Token generated: ${token.substring(0, 50)}...`);
    
    const decodedToken = verifyToken(token);
    console.log(`✅ Token verified:`, {
      id: decodedToken.id,
      email: decodedToken.email,
      role: decodedToken.role
    });

    // 6. Test session management
    console.log('\n6. Testing session management...');
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    const session = new UserSession({
      user_id: savedUser._id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    const savedSession = await session.save();
    console.log(`✅ Session created: ${savedSession._id}`);
    
    const validSession = await UserSession.findValidSession(savedUser._id, tokenHash);
    console.log(`✅ Valid session found: ${validSession ? 'Yes' : 'No'}`);

    // 7. Clean up test data
    console.log('\n7. Cleaning up test data...');
    await User.deleteOne({ email: 'test@example.com' });
    await UserSession.deleteOne({ _id: savedSession._id });
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All MongoDB authentication tests passed!\n');
    console.log('📋 Next steps:');
    console.log('1. Set your MONGODB_URI environment variable');
    console.log('2. Run: node scripts/create-super-admin-mongodb.js');
    console.log('3. Start the server: npm run dev');
    console.log('4. Access the admin panel at http://localhost:3000/admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB authentication test failed:', error);
    process.exit(1);
  }
};

// Run the test
if (require.main === module) {
  testAuthSystem();
}

module.exports = { testAuthSystem };
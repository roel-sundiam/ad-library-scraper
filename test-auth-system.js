#!/usr/bin/env node

/**
 * Test script to verify authentication system functionality
 */

const path = require('path');
require('dotenv').config();

const { initialize } = require('./src/database/init');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('./src/middleware/auth');

const testAuthSystem = async () => {
  try {
    console.log('🧪 Testing Authentication System...\n');

    // 1. Test database initialization
    console.log('1. Testing database initialization...');
    await initialize();
    console.log('✅ Database initialized successfully\n');

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

    // 4. Test JWT token generation and verification
    console.log('4. Testing JWT tokens...');
    const testUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      status: 'approved'
    };
    
    const token = generateToken(testUser);
    console.log(`✅ Token generated: ${token.substring(0, 50)}...`);
    
    const decodedToken = verifyToken(token);
    console.log(`✅ Token verified:`, {
      id: decodedToken.id,
      email: decodedToken.email,
      role: decodedToken.role
    });

    const invalidToken = verifyToken('invalid.token.here');
    console.log(`✅ Invalid token verification: ${invalidToken}\n`);

    console.log('🎉 All authentication tests passed!\n');
    console.log('📋 Next steps:');
    console.log('1. Run: node scripts/create-super-admin.js');
    console.log('2. Start the server: npm run dev');
    console.log('3. Access the admin panel at http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    process.exit(1);
  }
};

// Run the test
if (require.main === module) {
  testAuthSystem();
}

module.exports = { testAuthSystem };
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables for Railway
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Using Railway production environment');
} else {
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment');
}

const verifyJWTSecret = async () => {
  let connection;
  
  try {
    // Create connection using DATABASE_URL or individual variables
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      connection = await mysql.createConnection({
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        port: url.port || 3306
      });
      console.log('🔧 Connected using DATABASE_URL');
    } else {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'menuauto_db',
        port: process.env.DB_PORT || 3306
      });
      console.log('🔧 Connected using individual variables');
    }

    console.log('✅ Database connected successfully');

    // Check JWT_SECRET
    console.log('🔐 Current JWT_SECRET:', process.env.JWT_SECRET);
    console.log('🔐 Current SESSION_SECRET:', process.env.SESSION_SECRET);

    // Test JWT token generation with current secret
    console.log('\n🧪 Testing JWT token generation...');
    
    const testUser = {
      userId: 1,
      username: 'waiter1',
      role: 'waiter'
    };
    
    const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Generated test token:', token.substring(0, 50) + '...');
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verification successful:', decoded);
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
    }

    // Test with a known invalid token (from the error logs)
    console.log('\n🧪 Testing with known invalid token...');
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoid2FpdGVyMSIsInJvbGUiOiJ3YWl0ZXIiLCJpYXQiOjE3NTM5MTUyNzcsImV4cCI6MTc1NDAwMTY3N30.gZsoyYolmgAv3vOhqpN1atD2g48irNigimSJKQA57EE';
    
    try {
      const decodedInvalid = jwt.verify(invalidToken, process.env.JWT_SECRET);
      console.log('✅ Invalid token verification successful:', decodedInvalid);
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', error.message);
    }

    // Verify users exist and have correct passwords
    console.log('\n🔍 Verifying users...');
    const [usersResult] = await connection.execute('SELECT username, password FROM users');
    
    console.log('📋 Current users:');
    usersResult.forEach(user => {
      console.log(`- ${user.username}: ${user.password.substring(0, 20)}...`);
    });

    // Test password verification
    console.log('\n🔐 Testing password verification...');
    const testPassword = 'password';
    const hashedPassword = usersResult.find(u => u.username === 'waiter1')?.password;
    
    if (hashedPassword) {
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('❌ User waiter1 not found');
    }

    // Generate a fresh token for testing
    console.log('\n🔄 Generating fresh token for testing...');
    const freshToken = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Fresh token generated:', freshToken.substring(0, 50) + '...');
    
    try {
      const decodedFresh = jwt.verify(freshToken, process.env.JWT_SECRET);
      console.log('✅ Fresh token verification successful:', decodedFresh);
    } catch (error) {
      console.error('❌ Fresh token verification failed:', error.message);
    }

    console.log('\n🎉 JWT verification completed!');
    console.log('📝 The issue might be with cached tokens in the browser');
    console.log('🔐 Try clearing browser cache and logging in again');
    console.log('🔄 All users should use password: password');

  } catch (error) {
    console.error('❌ Error verifying JWT:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

verifyJWTSecret(); 
const mysql = require('mysql2/promise');

// Load environment variables for Railway
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Using Railway production environment');
} else {
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment');
}

const resetJWT = async () => {
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
    console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET);
    console.log('🔐 SESSION_SECRET:', process.env.SESSION_SECRET);

    // Verify users exist and have correct passwords
    console.log('\n🔍 Verifying users...');
    const [usersResult] = await connection.execute('SELECT username, password FROM users');
    
    console.log('📋 Current users:');
    usersResult.forEach(user => {
      console.log(`- ${user.username}: ${user.password.substring(0, 20)}...`);
    });

    // Test JWT token generation
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    
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

    console.log('\n🎉 JWT and authentication check completed!');
    console.log('📝 If everything shows ✅, try logging in again');
    console.log('🔐 All users should use password: password');

  } catch (error) {
    console.error('❌ Error checking JWT:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

resetJWT(); 
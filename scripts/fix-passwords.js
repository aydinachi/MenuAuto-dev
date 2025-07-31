const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Load environment variables for Railway
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Using Railway production environment');
} else {
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment');
}

const fixPasswords = async () => {
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

    // Hash the password properly
    const password = 'password';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Generated hash for password:', hashedPassword);

    // Update all users with the correct password hash
    console.log('👥 Updating user passwords...');
    
    const users = ['waiter1', 'waiter2', 'cook1', 'cook2', 'bartender1', 'admin'];
    
    for (const username of users) {
      await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, username]
      );
      console.log(`✅ Updated password for ${username}`);
    }

    // Verify the update
    console.log('\n🔍 Verifying users...');
    const [usersResult] = await connection.execute('SELECT username, password FROM users');
    
    console.log('📋 Current users:');
    usersResult.forEach(user => {
      console.log(`- ${user.username}: ${user.password.substring(0, 20)}...`);
    });

    console.log('\n🎉 Passwords updated successfully!');
    console.log('🔐 All users now have password: password');
    console.log('✅ You can now login with any user using password: password');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

fixPasswords(); 
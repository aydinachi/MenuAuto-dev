const mysql = require('mysql2/promise');

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  // Production: Railway will provide environment variables
  console.log('🔧 Using production environment variables');
} else {
  // Development: Load from config.env
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment variables');
}

// Use DATABASE_URL if available (Railway), otherwise use individual variables
let pool;

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL from Railway
  const url = new URL(process.env.DATABASE_URL);
  pool = mysql.createPool({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1), // Remove leading slash
    port: url.port || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('🔧 Using DATABASE_URL from Railway');
} else {
  // Use individual environment variables
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'menuauto_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('🔧 Using individual database variables');
}

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('Please make sure MySQL is running and the database exists');
  });

module.exports = pool; 
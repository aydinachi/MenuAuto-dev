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

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'menuauto_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Please make sure MySQL is running and the database exists');
  }
};

testConnection();

module.exports = pool; 
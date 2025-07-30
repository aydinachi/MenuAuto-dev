const { Pool } = require('pg');
// Load environment variables
if (process.env.NODE_ENV === 'production') {
  // Production: Railway will provide environment variables
  console.log('🔧 Using production environment variables');
} else {
  // Development: Load from config.env
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release(); // vrati klijent u pool
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Please make sure PostgreSQL is running and the database exists');
  }
};

testConnection();

module.exports = pool; 
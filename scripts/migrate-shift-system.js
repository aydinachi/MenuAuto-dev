const mysql = require('mysql2/promise');

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Using Railway production environment');
} else {
  require('dotenv').config({ path: './config.env' });
  console.log('🔧 Using development environment');
}

const migrateShiftSystem = async () => {
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
    console.log('🔄 Starting shift system migration...');

    // Check if tables exist and need migration
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('shift_sessions', 'daily_reports', 'report_items')
    `);

    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('📋 Existing tables:', existingTables);

    // Drop existing tables if they exist (for clean migration)
    if (existingTables.includes('report_items')) {
      await connection.execute('DROP TABLE IF EXISTS report_items');
      console.log('🗑️ Dropped report_items table');
    }
    
    if (existingTables.includes('daily_reports')) {
      await connection.execute('DROP TABLE IF EXISTS daily_reports');
      console.log('🗑️ Dropped daily_reports table');
    }
    
    if (existingTables.includes('shift_sessions')) {
      await connection.execute('DROP TABLE IF EXISTS shift_sessions');
      console.log('🗑️ Dropped shift_sessions table');
    }

    // Create new shift_sessions table
    await connection.execute(`
      CREATE TABLE shift_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shift_date DATE NOT NULL,
        waiter_id INT NOT NULL,
        shift_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shift_end TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        total_orders INT DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (waiter_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created new shift_sessions table');

    // Create new daily_reports table
    await connection.execute(`
      CREATE TABLE daily_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_date DATE NOT NULL,
        shift_id INT NOT NULL,
        waiter_id INT NOT NULL,
        shift_start TIME NOT NULL,
        shift_end TIME NOT NULL,
        total_orders INT DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        total_cancelled_revenue DECIMAL(10,2) DEFAULT 0,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shift_sessions(id),
        FOREIGN KEY (waiter_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Created new daily_reports table');

    // Create new report_items table
    await connection.execute(`
      CREATE TABLE report_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        subcategory VARCHAR(50),
        quantity_sold INT DEFAULT 0,
        quantity_cancelled INT DEFAULT 0,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        cancelled_revenue DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      )
    `);
    console.log('✅ Created new report_items table');

    // Create initial shift for today for each waiter
    const [waiters] = await connection.execute(`
      SELECT id, name FROM users WHERE role = 'waiter'
    `);

    for (const waiter of waiters) {
      await connection.execute(`
        INSERT INTO shift_sessions (shift_date, waiter_id, shift_start, is_active, created_by)
        VALUES (CURDATE(), ?, CURRENT_TIMESTAMP, TRUE, ?)
      `, [waiter.id, waiter.id]);
      console.log(`✅ Created initial shift for ${waiter.name}`);
    }

    console.log('🎉 Shift system migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateShiftSystem()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateShiftSystem; 
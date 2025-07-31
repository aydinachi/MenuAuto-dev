const mysql = require('mysql2/promise');

// Load environment variables for Railway
if (process.env.NODE_ENV === 'production') {
  console.log('🔧 Using Railway production environment');
} else {
  require('dotenv').config({ path: '../config.env' });
  console.log('🔧 Using development environment');
}

const initRailwayDatabase = async () => {
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

    // Create tables
    console.log('📋 Creating tables...');

    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('waiter', 'cook', 'bartender', 'admin') NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // Menu items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category ENUM('food', 'drink') NOT NULL,
        subcategory VARCHAR(50),
        price DECIMAL(10,2) NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Menu items table created');

    // Orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_number INT NOT NULL,
        waiter_id INT,
        status ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (waiter_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Orders table created');

    // Order items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        size VARCHAR(20),
        variation VARCHAR(50),
        notes TEXT,
        status ENUM('pending', 'preparing', 'ready', 'cancelled') DEFAULT 'pending',
        cancelled_at TIMESTAMP NULL,
        cancelled_by INT NULL,
        cancelled_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
        FOREIGN KEY (cancelled_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Order items table created');

    // Daily reports table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daily_reports (
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
    console.log('✅ Daily reports table created');

    // Report items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS report_items (
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
    console.log('✅ Report items table created');

    // Shift sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shift_sessions (
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
    console.log('✅ Shift sessions table created');

    // Inventory table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'pieces',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Inventory table created');

    // Insert sample users with proper bcrypt hashed passwords
    console.log('👥 Inserting sample users...');
    await connection.execute(`
      INSERT IGNORE INTO users (username, password, role, name) VALUES
      ('waiter1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'waiter', 'Konobar 1'),
      ('waiter2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'waiter', 'Konobar 2'),
      ('cook1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cook', 'Kuvar 1'),
      ('cook2', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'cook', 'Kuvar 2'),
      ('bartender1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'bartender', 'Barmen 1'),
      ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administrator')
    `);
    console.log('✅ Sample users inserted');

    // Insert sample menu items
    console.log('🍽️ Inserting sample menu items...');
    await connection.execute(`
      INSERT IGNORE INTO menu_items (name, description, category, subcategory, price, is_available) VALUES
      -- Hot Drinks
      ('Espresso', 'Jaka kafa u maloj šalici', 'drink', 'kafa', 2.50, true),
      ('Cappuccino', 'Kafa sa mlekom i pjenom', 'drink', 'kafa', 3.50, true),
      ('Topla čokolada', 'Topla čokolada sa šlagom', 'drink', 'kafa', 4.50, true),
      
      -- Cold Drinks
      ('Coca Cola', 'Gazirano piće', 'drink', 'gazirano', 3.50, true),
      ('Limunada', 'Sveža limunada', 'drink', 'limunada', 3.50, true),
      ('Sok od pomorandže', 'Prirodni sok', 'drink', 'sok', 4.00, true),
      ('Voda', 'Mineralna voda', 'drink', 'voda', 2.00, true),
      
      -- Alcoholic Drinks
      ('Pivo', 'Domaće pivo', 'drink', 'alkohol', 4.50, true),
      ('Vino', 'Kućno vino', 'drink', 'alkohol', 6.00, true),
      ('Whiskey', 'Whiskey sa ledom', 'drink', 'alkohol', 7.00, true),
      
      -- Food - Pizza
      ('Pizza', 'Izaberite varijaciju: Margherita, Hawaii, Pepperoni', 'food', 'pizza', 12.00, true),
      
      -- Food - Burgers
      ('Classic Burger', 'Klasični burger sa pomfritom', 'food', 'burger', 14.00, true),
      ('Cheese Burger', 'Burger sa sirom', 'food', 'burger', 16.00, true),
      
      -- Food - Pasta
      ('Spaghetti Bolognese', 'Tjestenina sa mlevenim mesom', 'food', 'pasta', 12.00, true),
      ('Pasta Carbonara', 'Tjestenina sa pancetom i jajima', 'food', 'pasta', 13.00, true),
      
      -- Food - Salads
      ('Cezar salata', 'Salata sa piletinom i parmezanom', 'food', 'salata', 10.00, true),
      ('Grčka salata', 'Salata sa feta sirom i maslinama', 'food', 'salata', 9.00, true),
      
      -- Food - Main Dishes
      ('Pileći kotlet', 'Pileći kotlet sa pomfritom', 'food', 'glavno_jelo', 15.00, true),
      ('Steak', 'Govedji steak sa pomfritom', 'food', 'glavno_jelo', 22.00, true),
      
      -- Food - Desserts
      ('Tiramisu', 'Italijanski desert', 'food', 'desert', 6.50, true),
      ('Čokoladna torta', 'Čokoladna torta sa šlagom', 'food', 'desert', 5.50, true)
    `);
    console.log('✅ Sample menu items inserted');

    console.log('\n🎉 Railway database initialized successfully!');
    console.log('📊 Database tables created and populated with sample data');
    console.log('👥 Sample users created (password: password)');
    console.log('🍽️ Sample menu items added');

  } catch (error) {
    console.error('❌ Error initializing Railway database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

initRailwayDatabase(); 
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const createDatabase = async () => {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'menuauto_db'}`);
    console.log('✅ Database created successfully');

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'menuauto_db'}`);

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('waiter', 'cook', 'bartender', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create menu_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category ENUM('food', 'drink') NOT NULL,
        subcategory VARCHAR(50),
        is_available BOOLEAN DEFAULT TRUE,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_number INT NOT NULL,
        waiter_id INT NOT NULL,
        status ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create order_items table with additional fields
    await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            menu_item_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL,
            notes TEXT,
            size VARCHAR(50),
            variation VARCHAR(100),
            status ENUM('pending', 'preparing', 'ready', 'cancelled') DEFAULT 'pending',
            cancelled_at TIMESTAMP NULL,
            cancelled_by INT NULL,
            cancelled_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
            FOREIGN KEY (cancelled_by) REFERENCES users(id)
        )
    `);

    // Create shift_sessions table
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

    // Create daily_reports table
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

    // Create report_items table
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

    // Create inventory table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category ENUM('drink', 'food', 'supplies') NOT NULL,
            unit VARCHAR(50) NOT NULL,
            received_quantity DECIMAL(10,2) DEFAULT 0,
            used_quantity DECIMAL(10,2) DEFAULT 0,
            min_quantity DECIMAL(10,2) DEFAULT 0,
            price_per_unit DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ Inventory table created');

    // Add some sample inventory items
    await connection.query(`
        INSERT IGNORE INTO inventory (name, category, unit, received_quantity, min_quantity, price_per_unit) VALUES
        ('Pivo', 'drink', 'kom', 100, 10, 2.50),
        ('Vino', 'drink', 'l', 50, 5, 15.00),
        ('Kafa', 'drink', 'kg', 20, 2, 25.00),
        ('Meso', 'food', 'kg', 30, 5, 35.00),
        ('Povrće', 'food', 'kg', 25, 3, 8.00),
        ('Papir', 'supplies', 'pak', 50, 5, 5.00)
    `);
    console.log('✅ Sample inventory data inserted');

    console.log('✅ Tables created successfully');

    // Add missing columns to existing tables if they don't exist
    try {
        // Add size and variation columns to order_items if they don't exist
        await connection.query(`
            ALTER TABLE order_items 
            ADD COLUMN IF NOT EXISTS size VARCHAR(50) NULL,
            ADD COLUMN IF NOT EXISTS variation VARCHAR(100) NULL
        `);
        console.log('✅ Updated order_items table with size and variation columns');
    } catch (error) {
        console.log('ℹ️ order_items table already has required columns');
    }

    // Insert seed data for users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      ['waiter1', hashedPassword, 'Marko Konobar', 'waiter'],
      ['waiter2', hashedPassword, 'Ana Konobar', 'waiter'],
      ['cook1', hashedPassword, 'Petar Kuhar', 'cook'],
      ['cook2', hashedPassword, 'Marija Kuhar', 'cook'],
      ['bartender1', hashedPassword, 'Stefan Šanker', 'bartender'],
      ['bartender2', hashedPassword, 'Jovana Šanker', 'bartender'],
      ['admin', hashedPassword, 'Admin User', 'admin']
    ];

    for (const user of users) {
      await connection.query(
        'INSERT IGNORE INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
        user
      );
    }

    // Insert sample menu items
    await connection.query(`
        INSERT IGNORE INTO menu_items (name, description, category, subcategory, price, is_available) VALUES
        -- Hot Drinks (Demo)
        ('Espresso', 'Jaka kafa u maloj šalici', 'drink', 'kafa', 2.50, true),
        ('Cappuccino', 'Kafa sa mlekom i pjenom', 'drink', 'kafa', 3.50, true),
        ('Topla čokolada', 'Topla čokolada sa šlagom', 'drink', 'kafa', 4.50, true),
        
        -- Cold Drinks (Demo)
        ('Coca Cola', 'Gazirano piće', 'drink', 'gazirano', 3.50, true),
        ('Limunada', 'Sveža limunada', 'drink', 'limunada', 3.50, true),
        ('Sok od pomorandže', 'Prirodni sok', 'drink', 'sok', 4.00, true),
        ('Voda', 'Mineralna voda', 'drink', 'voda', 2.00, true),
        
        -- Alcoholic Drinks (Demo)
        ('Pivo', 'Domaće pivo', 'drink', 'alkohol', 4.50, true),
        ('Vino', 'Kućno vino', 'drink', 'alkohol', 6.00, true),
        ('Whiskey', 'Whiskey sa ledom', 'drink', 'alkohol', 7.00, true),
        
        -- Food - Pizza (Demo)
        ('Pizza', 'Izaberite varijaciju: Margherita, Hawaii, Pepperoni', 'food', 'pizza', 12.00, true),
        
        -- Food - Burgers (Demo)
        ('Classic Burger', 'Klasični burger sa pomfritom', 'food', 'burger', 14.00, true),
        ('Cheese Burger', 'Burger sa sirom', 'food', 'burger', 16.00, true),
        
        -- Food - Pasta (Demo)
        ('Spaghetti Bolognese', 'Tjestenina sa mlevenim mesom', 'food', 'pasta', 12.00, true),
        ('Pasta Carbonara', 'Tjestenina sa pancetom i jajima', 'food', 'pasta', 13.00, true),
        
        -- Food - Salads (Demo)
        ('Cezar salata', 'Salata sa piletinom i parmezanom', 'food', 'salata', 10.00, true),
        ('Grčka salata', 'Salata sa feta sirom i maslinama', 'food', 'salata', 9.00, true),
        
        -- Food - Main Dishes (Demo)
        ('Pileći kotlet', 'Pileći kotlet sa pomfritom', 'food', 'glavno_jelo', 15.00, true),
        ('Steak', 'Govedji steak sa pomfritom', 'food', 'glavno_jelo', 22.00, true),
        
        -- Food - Desserts (Demo)
        ('Tiramisu', 'Italijanski desert', 'food', 'desert', 6.50, true),
        ('Čokoladna torta', 'Čokoladna torta sa šlagom', 'food', 'desert', 5.50, true)
    `);

    console.log('✅ Seed data inserted successfully');
    console.log('\n📋 Default login credentials:');
    console.log('Username: waiter1, cook1, bartender1, admin');
    console.log('Password: password123');

  } catch (error) {
    console.error('❌ Error creating database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

createDatabase(); 
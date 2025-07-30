const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const fixDatabase = async () => {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'menuauto_db'
        });

        console.log('🔧 Fixing database structure...');

        // Add size column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE order_items 
                ADD COLUMN size VARCHAR(50) NULL
            `);
            console.log('✅ Added size column to order_items table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ size column already exists');
            } else {
                throw error;
            }
        }

        // Add variation column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE order_items 
                ADD COLUMN variation VARCHAR(100) NULL
            `);
            console.log('✅ Added variation column to order_items table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ variation column already exists');
            } else {
                throw error;
            }
        }

        // Add cancelled_at column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE order_items 
                ADD COLUMN cancelled_at TIMESTAMP NULL
            `);
            console.log('✅ Added cancelled_at column to order_items table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ cancelled_at column already exists');
            } else {
                throw error;
            }
        }

        // Add cancelled_by column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE order_items 
                ADD COLUMN cancelled_by INT NULL
            `);
            console.log('✅ Added cancelled_by column to order_items table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ cancelled_by column already exists');
            } else {
                throw error;
            }
        }

        // Add cancelled_reason column if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE order_items 
                ADD COLUMN cancelled_reason TEXT NULL
            `);
            console.log('✅ Added cancelled_reason column to order_items table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ cancelled_reason column already exists');
            } else {
                throw error;
            }
        }

        // Show table structure
        const [columns] = await connection.execute('DESCRIBE order_items');
        console.log('\n📋 Current order_items table structure:');
        columns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n✅ Database structure fixed successfully!');

    } catch (error) {
        console.error('❌ Error fixing database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

fixDatabase(); 
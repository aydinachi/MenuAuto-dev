const mysql = require('mysql2/promise');
require('dotenv').config({ path: './config.env' });

const createTestData = async () => {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'menuauto_db'
        });

        console.log('🔧 Creating test data...');

        // Create a test shift session
        const [shiftResult] = await connection.execute(`
            INSERT INTO shift_sessions (shift_date, shift_start, shift_end, is_active, created_by)
            VALUES (CURDATE(), NOW(), NOW(), FALSE, 1)
        `);
        const shiftId = shiftResult.insertId;
        console.log('✅ Created test shift session');

        // Create test orders
        const orders = [
            { table_number: 1, waiter_id: 1, status: 'served', total_amount: 25.50, notes: 'Test narudžba 1' },
            { table_number: 2, waiter_id: 1, status: 'served', total_amount: 18.00, notes: 'Test narudžba 2' },
            { table_number: 3, waiter_id: 1, status: 'cancelled', total_amount: 12.00, notes: 'Otkazana narudžba' }
        ];

        for (const order of orders) {
            const [orderResult] = await connection.execute(`
                INSERT INTO orders (table_number, waiter_id, status, total_amount, notes, created_at)
                VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 2 HOUR))
            `, [order.table_number, order.waiter_id, order.status, order.total_amount, order.notes]);
            
            const orderId = orderResult.insertId;
            console.log(`✅ Created test order ${orderId}`);

            // Add order items
            const items = [
                { menu_item_id: 1, quantity: 2, unit_price: 12.00, status: 'ready' }, // Pizza Margherita
                { menu_item_id: 13, quantity: 1, unit_price: 2.50, status: 'ready' }, // Kafa
                { menu_item_id: 20, quantity: 1, unit_price: 3.50, status: 'ready' }  // Coca Cola
            ];

            for (const item of items) {
                await connection.execute(`
                    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status)
                    VALUES (?, ?, ?, ?, ?)
                `, [orderId, item.menu_item_id, item.quantity, item.unit_price, item.status]);
            }
        }

        // Create a daily report
        const [reportResult] = await connection.execute(`
            INSERT INTO daily_reports (report_date, shift_start, shift_end, total_orders, total_revenue, total_cancelled_orders, total_cancelled_revenue, created_by)
            VALUES (CURDATE(), '08:00:00', '16:00:00', 2, 43.50, 1, 12.00, 1)
        `);
        const reportId = reportResult.insertId;
        console.log('✅ Created test daily report');

        // Add report items
        const reportItems = [
            { menu_item_id: 1, item_name: 'Pizza Margherita', category: 'food', quantity_sold: 4, quantity_cancelled: 0, total_revenue: 48.00, cancelled_revenue: 0.00 },
            { menu_item_id: 13, item_name: 'Kafa', category: 'drink', quantity_sold: 2, quantity_cancelled: 0, total_revenue: 5.00, cancelled_revenue: 0.00 },
            { menu_item_id: 20, item_name: 'Coca Cola', category: 'drink', quantity_sold: 2, quantity_cancelled: 1, total_revenue: 7.00, cancelled_revenue: 3.50 }
        ];

        for (const item of reportItems) {
            await connection.execute(`
                INSERT INTO report_items (report_id, menu_item_id, item_name, category, quantity_sold, quantity_cancelled, total_revenue, cancelled_revenue)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [reportId, item.menu_item_id, item.item_name, item.category, item.quantity_sold, item.quantity_cancelled, item.total_revenue, item.cancelled_revenue]);
        }

        console.log('✅ Test data created successfully!');
        console.log('📊 You can now test the reports functionality');

    } catch (error) {
        console.error('❌ Error creating test data:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

createTestData(); 
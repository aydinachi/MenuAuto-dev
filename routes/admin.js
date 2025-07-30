const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get admin dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        // Get total revenue
        const [revenueResult] = await connection.execute(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue
            FROM orders 
            WHERE status = 'served' 
            AND DATE(created_at) = CURDATE()
        `);
        
        // Get total orders today
        const [ordersResult] = await connection.execute(`
            SELECT COUNT(*) as total_orders
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        // Get active waiters
        const [waitersResult] = await connection.execute(`
            SELECT COUNT(DISTINCT waiter_id) as active_waiters
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);
        
        // Get low stock items
        const [lowStockResult] = await connection.execute(`
            SELECT COUNT(*) as low_stock_count
            FROM inventory 
            WHERE (received_quantity - used_quantity) <= min_quantity
        `);
        
        connection.release();
        
        res.json({
            totalRevenue: parseFloat(revenueResult[0].total_revenue),
            totalOrders: ordersResult[0].total_orders,
            activeWaiters: waitersResult[0].active_waiters,
            lowStockItems: lowStockResult[0].low_stock_count
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sales chart data
router.get('/charts/sales-time', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        // Get sales by hour for today
        const [salesData] = await connection.execute(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as orders,
                SUM(total_amount) as revenue
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
            GROUP BY HOUR(created_at)
            ORDER BY hour
        `);
        
        connection.release();
        
        res.json(salesData);
        
    } catch (error) {
        console.error('Sales chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get top selling items
router.get('/charts/top-items', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        const [topItems] = await connection.execute(`
            SELECT 
                mi.name,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * mi.price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'served'
            AND DATE(o.created_at) = CURDATE()
            GROUP BY mi.id, mi.name
            ORDER BY total_quantity DESC
            LIMIT 10
        `);
        
        connection.release();
        
        res.json(topItems);
        
    } catch (error) {
        console.error('Top items chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get staff performance
router.get('/staff/performance', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        const [staffStats] = await connection.execute(`
            SELECT 
                u.username,
                u.full_name as name,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_revenue,
                AVG(o.total_amount) as avg_order_value
            FROM users u
            LEFT JOIN orders o ON u.id = o.waiter_id 
            AND DATE(o.created_at) = CURDATE()
            WHERE u.role = 'waiter'
            GROUP BY u.id, u.username, u.full_name
            ORDER BY total_revenue DESC
        `);
        
        connection.release();
        
        res.json(staffStats);
        
    } catch (error) {
        console.error('Staff performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Inventory management routes
router.get('/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        const [inventory] = await connection.execute(`
            SELECT 
                id, name, category, unit, 
                received_quantity, used_quantity, 
                (received_quantity - used_quantity) as remaining_quantity,
                min_quantity, price_per_unit,
                CASE 
                    WHEN (received_quantity - used_quantity) <= min_quantity THEN 'low'
                    ELSE 'ok'
                END as status
            FROM inventory
            ORDER BY name
        `);
        
        connection.release();
        
        res.json(inventory);
        
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, category, unit, received_quantity, min_quantity, price_per_unit } = req.body;
        
        const connection = await db.getConnection();
        
        const [result] = await connection.execute(`
            INSERT INTO inventory (name, category, unit, received_quantity, used_quantity, min_quantity, price_per_unit)
            VALUES (?, ?, ?, ?, 0, ?, ?)
        `, [name, category, unit, received_quantity, min_quantity, price_per_unit]);
        
        connection.release();
        
        res.status(201).json({ 
            message: 'Inventory item added successfully',
            id: result.insertId 
        });
        
    } catch (error) {
        console.error('Add inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/inventory/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { received_quantity, used_quantity, min_quantity } = req.body;
        
        const connection = await db.getConnection();
        
        await connection.execute(`
            UPDATE inventory 
            SET received_quantity = received_quantity + ?,
                used_quantity = used_quantity + ?,
                min_quantity = ?
            WHERE id = ?
        `, [received_quantity || 0, used_quantity || 0, min_quantity, id]);
        
        connection.release();
        
        res.json({ message: 'Inventory updated successfully' });
        
    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate bar book
router.get('/bar-book/:date', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date } = req.params;
        
        const connection = await db.getConnection();
        
        // Get drink sales for the date
        const [drinkSales] = await connection.execute(`
            SELECT 
                mi.name,
                mi.price,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * mi.price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE mi.category = 'drink'
            AND DATE(o.created_at) = ?
            AND o.status = 'served'
            GROUP BY mi.id, mi.name, mi.price
            ORDER BY total_quantity DESC
        `, [date]);
        
        // Get inventory usage for drinks
        const [inventoryUsage] = await connection.execute(`
            SELECT 
                name,
                unit,
                used_quantity,
                price_per_unit,
                (used_quantity * price_per_unit) as total_cost
            FROM inventory
            WHERE category = 'drink'
            AND DATE(updated_at) = ?
        `, [date]);
        
        connection.release();
        
        res.json({
            date,
            drinkSales,
            inventoryUsage,
            totalRevenue: drinkSales.reduce((sum, item) => sum + parseFloat(item.total_revenue), 0),
            totalCost: inventoryUsage.reduce((sum, item) => sum + parseFloat(item.total_cost), 0)
        });
        
    } catch (error) {
        console.error('Bar book error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 
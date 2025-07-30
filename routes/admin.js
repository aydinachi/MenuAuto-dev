const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get admin dashboard statistics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get total revenue
        const revenueResult = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_revenue
            FROM orders 
            WHERE status = 'served' 
            AND created_at::date = CURRENT_DATE
        `);
        
        // Get total orders today
        const ordersResult = await db.query(`
            SELECT COUNT(*) as total_orders
            FROM orders 
            WHERE created_at::date = CURRENT_DATE
        `);
        
        // Get active waiters
        const waitersResult = await db.query(`
            SELECT COUNT(DISTINCT waiter_id) as active_waiters
            FROM orders 
            WHERE created_at::date = CURRENT_DATE
        `);
        
        // Get low stock items
        const lowStockResult = await db.query(`
            SELECT COUNT(*) as low_stock_count
            FROM inventory 
            WHERE (received_quantity - used_quantity) <= min_quantity
        `);
                
        res.json({
            totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
            totalOrders: ordersResult.rows[0].total_orders,
            activeWaiters: waitersResult.rows[0].active_waiters,
            lowStockItems: lowStockResult.rows[0].low_stock_count
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sales chart data
router.get('/charts/sales-time', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get sales by hour for today
        const salesData = await db.query(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as orders,
                SUM(total_amount) as revenue
            FROM orders 
            WHERE created_at::date = CURRENT_DATE
            GROUP BY hour
            ORDER BY hour
        `);
                
        res.json(salesData.rows);
        
    } catch (error) {
        console.error('Sales chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get top selling items
router.get('/charts/top-items', authenticateToken, requireAdmin, async (req, res) => {
    try {
        
        const topItems = await db.query(`
            SELECT 
                mi.name,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * mi.price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'served'
            AND o.created_at::date = CURRENT_DATE
            GROUP BY mi.id, mi.name
            ORDER BY total_quantity DESC
            LIMIT 10
        `);
                
        res.json(topItems.rows);
        
    } catch (error) {
        console.error('Top items chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get staff performance
router.get('/staff/performance', authenticateToken, requireAdmin, async (req, res) => {
    try {        
        const staffStats = await db.query(`
            SELECT 
                u.username,
                u.full_name as name,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_revenue,
                AVG(o.total_amount) as avg_order_value
            FROM users u
            LEFT JOIN orders o ON u.id = o.waiter_id 
            AND o.created_at::date = CURRENT_DATE
            WHERE u.role = 'waiter'
            GROUP BY u.id, u.username, u.full_name
            ORDER BY total_revenue DESC
        `);
                
        res.json(staffStats.rows);
        
    } catch (error) {
        console.error('Staff performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Inventory management routes
router.get('/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {        
        const inventory = await db.query(`
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
                
        res.json(inventory.rows);
        
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, category, unit, received_quantity, min_quantity, price_per_unit } = req.body;
                
        const result = await db.query(`
            INSERT INTO inventory (name, category, unit, received_quantity, used_quantity, min_quantity, price_per_unit)
            VALUES ($1, $2, $3, $4, 0, $5, $6)
        `, [name, category, unit, received_quantity, min_quantity, price_per_unit]);
                
        res.status(201).json({ 
            message: 'Inventory item added successfully',
            id: result.rows[0].id
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
                
        await db.query(`
            UPDATE inventory 
            SET received_quantity = received_quantity + $1,
                used_quantity = used_quantity + $2,
                min_quantity = $3
            WHERE id = $4
        `, [received_quantity || 0, used_quantity || 0, min_quantity, id]);
                
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
                
        // Get drink sales for the date
        const drinkSalesResult = await db.query(`
            SELECT 
                mi.name,
                mi.price,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * mi.price) as total_revenue
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            JOIN orders o ON oi.order_id = o.id
            WHERE mi.category = 'drink'
            AND o.created_at::date = $1
            AND o.status = 'served'
            GROUP BY mi.id, mi.name, mi.price
            ORDER BY total_quantity DESC
        `, [date]);
        
        // Get inventory usage for drinks
        const inventoryUsageResult = await db.query(`
            SELECT 
                name,
                unit,
                used_quantity,
                price_per_unit,
                (used_quantity * price_per_unit) as total_cost
            FROM inventory
            WHERE category = 'drink'
            AND updated_at::date = $1
        `, [date]);
        
        const drinkSales = drinkSalesResult.rows;
        const inventoryUsage = inventoryUsageResult.rows;

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
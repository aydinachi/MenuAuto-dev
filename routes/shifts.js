const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Start new shift
router.post('/new', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // End current active shift
    await connection.execute(`
      UPDATE shift_sessions 
      SET shift_end = CURRENT_TIMESTAMP, is_active = FALSE 
      WHERE is_active = TRUE
    `);
    
    // Generate daily report for previous shift
    const [activeOrders] = await connection.execute(`
      SELECT o.*, u.full_name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.status IN ('pending', 'preparing', 'ready')
    `);
    
    if (activeOrders.length > 0) {
      // Create daily report
      const [reportResult] = await connection.execute(`
        INSERT INTO daily_reports (report_date, shift_start, shift_end, total_orders, total_revenue, created_by)
        VALUES (CURDATE(), '08:00:00', '16:00:00', ?, ?, ?)
      `, [activeOrders.length, 0, req.user.id]);
      
      const reportId = reportResult.insertId;
      
      // Get all items for the day
      const [allItems] = await connection.execute(`
        SELECT oi.*, mi.name, mi.category, mi.subcategory
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.created_at) = CURDATE()
      `);
      
      // Group items by menu_item_id
      const itemStats = {};
      allItems.forEach(item => {
        const key = item.menu_item_id;
        if (!itemStats[key]) {
          itemStats[key] = {
            menu_item_id: item.menu_item_id,
            item_name: item.name,
            category: item.category,
            quantity_sold: 0,
            quantity_cancelled: 0,
            total_revenue: 0,
            cancelled_revenue: 0
          };
        }
        
        if (item.status === 'cancelled') {
          itemStats[key].quantity_cancelled += item.quantity;
          itemStats[key].cancelled_revenue += item.unit_price * item.quantity;
        } else {
          itemStats[key].quantity_sold += item.quantity;
          itemStats[key].total_revenue += item.unit_price * item.quantity;
        }
      });
      
      // Insert report items
      for (const itemStat of Object.values(itemStats)) {
        await connection.execute(`
          INSERT INTO report_items (report_id, menu_item_id, item_name, category, quantity_sold, quantity_cancelled, total_revenue, cancelled_revenue)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          reportId,
          itemStat.menu_item_id,
          itemStat.item_name,
          itemStat.category,
          itemStat.quantity_sold,
          itemStat.quantity_cancelled,
          itemStat.total_revenue,
          itemStat.cancelled_revenue
        ]);
      }
      
      // Update report totals
      const totalRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.total_revenue, 0);
      const totalCancelledRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.cancelled_revenue, 0);
      
      await connection.execute(`
        UPDATE daily_reports 
        SET total_revenue = ?, total_cancelled_revenue = ?
        WHERE id = ?
      `, [totalRevenue, totalCancelledRevenue, reportId]);
    }
    
    // Start new shift
    const [shiftResult] = await connection.execute(`
      INSERT INTO shift_sessions (shift_date, created_by)
      VALUES (CURDATE(), ?)
    `, [req.user.id]);
    
    await connection.commit();
    
    res.json({ 
      message: 'New shift started successfully',
      shiftId: shiftResult.insertId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Start new shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Get daily reports
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    
    let query = `
      SELECT dr.*, u.full_name as created_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (date) {
      query += ' AND dr.report_date = ?';
      params.push(date);
    } else if (start_date && end_date) {
      query += ' AND dr.report_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else {
      query += ' AND dr.report_date = CURDATE()';
    }
    
    query += ' ORDER BY dr.report_date DESC, dr.created_at DESC';
    
    const [reports] = await db.execute(query, params);
    
    res.json({ reports });
    
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report details
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const [reports] = await db.execute(`
      SELECT dr.*, u.full_name as created_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.created_by = u.id
      WHERE dr.id = ?
    `, [reportId]);
    
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const [reportItems] = await db.execute(`
      SELECT * FROM report_items WHERE report_id = ?
      ORDER BY category, item_name
    `, [reportId]);
    
    const report = { ...reports[0], items: reportItems };
    
    res.json({ report });
    
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
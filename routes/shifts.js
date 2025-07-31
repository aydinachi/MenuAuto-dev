const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Start new shift for the logged-in user (waiter)
router.post('/new', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Use the logged-in user as the waiter
    const waiter_id = req.user.id;
    
    // Check if user is actually a waiter
    if (req.user.role !== 'waiter') {
      return res.status(400).json({ error: 'Only waiters can start shifts' });
    }
    
    // End current active shift for this waiter
    const [currentShift] = await connection.execute(`
      SELECT id, shift_start FROM shift_sessions 
      WHERE waiter_id = ? AND is_active = TRUE
    `, [waiter_id]);
    
    let reportGenerated = false;
    
    if (currentShift.length > 0) {
      const shift = currentShift[0];
      
      // End the current shift
      await connection.execute(`
        UPDATE shift_sessions 
        SET shift_end = CURRENT_TIMESTAMP, is_active = FALSE 
        WHERE id = ?
      `, [shift.id]);
      
      // Get orders for THIS SPECIFIC SHIFT (between shift_start and now)
      const [shiftOrders] = await connection.execute(`
        SELECT o.*, u.name as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.waiter_id = ? 
        AND o.created_at >= ? 
        AND o.created_at <= CURRENT_TIMESTAMP
      `, [waiter_id, shift.shift_start]);
      
      // Generate report for this specific shift if there are orders
      if (shiftOrders.length > 0) {
        // Get all items for this specific shift's orders
        const [allItems] = await connection.execute(`
          SELECT oi.*, mi.name, mi.category, mi.subcategory, mi.price
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.waiter_id = ? 
          AND o.created_at >= ? 
          AND o.created_at <= CURRENT_TIMESTAMP
        `, [waiter_id, shift.shift_start]);
        
        // Group items by menu_item_id
        const itemStats = {};
        allItems.forEach(item => {
          const key = item.menu_item_id;
          if (!itemStats[key]) {
            itemStats[key] = {
              menu_item_id: item.menu_item_id,
              item_name: item.name,
              category: item.category,
              subcategory: item.subcategory,
              quantity_sold: 0,
              quantity_cancelled: 0,
              total_revenue: 0,
              cancelled_revenue: 0
            };
          }
          
          if (item.status === 'cancelled') {
            itemStats[key].quantity_cancelled += item.quantity;
            itemStats[key].cancelled_revenue += item.price * item.quantity;
          } else {
            itemStats[key].quantity_sold += item.quantity;
            itemStats[key].total_revenue += item.price * item.quantity;
          }
        });
        
        // Calculate totals
        const totalRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.total_revenue, 0);
        const totalCancelledRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.cancelled_revenue, 0);
        
        // Create daily report for this specific shift
        const [reportResult] = await connection.execute(`
          INSERT INTO daily_reports (
            report_date, shift_id, waiter_id, shift_start, shift_end, 
            total_orders, total_revenue, total_cancelled_revenue, created_by
          )
          VALUES (CURDATE(), ?, ?, TIME(?), TIME(CURRENT_TIMESTAMP), ?, ?, ?, ?)
        `, [
          shift.id, 
          waiter_id, 
          shift.shift_start, 
          shiftOrders.length, 
          totalRevenue, 
          totalCancelledRevenue, 
          req.user.id
        ]);
        
        const reportId = reportResult.insertId;
        
        // Insert report items
        for (const itemStat of Object.values(itemStats)) {
          await connection.execute(`
            INSERT INTO report_items (
              report_id, menu_item_id, item_name, category, subcategory,
              quantity_sold, quantity_cancelled, total_revenue, cancelled_revenue
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            reportId,
            itemStat.menu_item_id,
            itemStat.item_name,
            itemStat.category,
            itemStat.subcategory,
            itemStat.quantity_sold,
            itemStat.quantity_cancelled,
            itemStat.total_revenue,
            itemStat.cancelled_revenue
          ]);
        }
        
        reportGenerated = true;
      }
    }
    
    // Start new shift for this waiter
    const [shiftResult] = await connection.execute(`
      INSERT INTO shift_sessions (shift_date, waiter_id, shift_start, is_active, created_by)
      VALUES (CURDATE(), ?, CURRENT_TIMESTAMP, TRUE, ?)
    `, [waiter_id, req.user.id]);
    
    await connection.commit();
    
    res.json({ 
      message: `Nova smjena uspješno započeta za ${req.user.name}!`,
      shiftId: shiftResult.insertId,
      waiterName: req.user.name,
      reportGenerated: reportGenerated
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Start new shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Get all active shifts
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const [shifts] = await db.execute(`
      SELECT ss.*, u.name as waiter_name
      FROM shift_sessions ss
      LEFT JOIN users u ON ss.waiter_id = u.id
      WHERE ss.is_active = TRUE
      ORDER BY ss.shift_start DESC
    `);
    
    res.json({ shifts });
    
  } catch (error) {
    console.error('Get active shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shifts for a specific waiter
router.get('/waiter/:waiterId', authenticateToken, async (req, res) => {
  try {
    const { waiterId } = req.params;
    const { date } = req.query;
    
    let query = `
      SELECT ss.*, u.name as waiter_name
      FROM shift_sessions ss
      LEFT JOIN users u ON ss.waiter_id = u.id
      WHERE ss.waiter_id = ?
    `;
    const params = [waiterId];
    
    if (date) {
      query += ' AND DATE(ss.shift_start) = ?';
      params.push(date);
    } else {
      query += ' AND DATE(ss.shift_start) = CURDATE()';
    }
    
    query += ' ORDER BY ss.shift_start DESC';
    
    const [shifts] = await db.execute(query, params);
    
    res.json({ shifts });
    
  } catch (error) {
    console.error('Get waiter shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily reports (can be filtered by waiter)
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const { date, start_date, end_date, waiter_id } = req.query;
    
    let query = `
      SELECT dr.*, u.name as waiter_name, u2.name as created_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.waiter_id = u.id
      LEFT JOIN users u2 ON dr.created_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    
    if (waiter_id) {
      query += ' AND dr.waiter_id = ?';
      params.push(waiter_id);
    }
    
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
      SELECT dr.*, u.name as waiter_name, u2.name as created_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.waiter_id = u.id
      LEFT JOIN users u2 ON dr.created_by = u2.id
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

// Get all waiters for shift management
router.get('/waiters', authenticateToken, async (req, res) => {
  try {
    const [waiters] = await db.execute(`
      SELECT id, name, username FROM users WHERE role = 'waiter' ORDER BY name
    `);
    
    res.json({ waiters });
    
  } catch (error) {
    console.error('Get waiters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
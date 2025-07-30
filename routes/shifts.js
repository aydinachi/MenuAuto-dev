const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Start new shift
router.post('/new', authenticateToken, async (req, res) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // End current active shift
    await client.query(`
      UPDATE shift_sessions 
      SET shift_end = CURRENT_TIMESTAMP, is_active = FALSE 
      WHERE is_active = TRUE
    `);

    // Generate daily report for previous shift
    const activeOrdersResult = await client.query(`
      SELECT o.*, u.full_name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.status IN ('pending', 'preparing', 'ready')
    `);

    const activeOrders = activeOrdersResult.rows;

    if (activeOrders.length > 0) {
      const reportResult = await client.query(`
        INSERT INTO daily_reports (report_date, shift_start, shift_end, total_orders, total_revenue, created_by)
        VALUES (CURRENT_DATE, '08:00:00', '16:00:00', $1, $2, $3)
        RETURNING id
      `, [activeOrders.length, 0, req.user.id]);

      const reportId = reportResult.rows[0].id;

      const allItemsResult = await client.query(`
        SELECT oi.*, mi.name, mi.category, mi.subcategory
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        WHERE DATE(o.created_at) = CURRENT_DATE
      `);

      const allItems = allItemsResult.rows;

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

      for (const itemStat of Object.values(itemStats)) {
        await client.query(`
          INSERT INTO report_items (report_id, menu_item_id, item_name, category, quantity_sold, quantity_cancelled, total_revenue, cancelled_revenue)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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

      const totalRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.total_revenue, 0);
      const totalCancelledRevenue = Object.values(itemStats).reduce((sum, item) => sum + item.cancelled_revenue, 0);

      await client.query(`
        UPDATE daily_reports 
        SET total_revenue = $1, total_cancelled_revenue = $2
        WHERE id = $3
      `, [totalRevenue, totalCancelledRevenue, reportId]);
    }

    const shiftResult = await client.query(`
      INSERT INTO shift_sessions (shift_date, created_by)
      VALUES (CURRENT_DATE, $1)
      RETURNING id
    `, [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: 'New shift started successfully',
      shiftId: shiftResult.rows[0].id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start new shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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
      query += ' AND dr.report_date = $1';
      params.push(date);
    } else if (start_date && end_date) {
      query += ' AND dr.report_date BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    } else {
      query += ' AND dr.report_date = CURRENT_DATE';
    }

    query += ' ORDER BY dr.report_date DESC, dr.created_at DESC';

    const result = await db.query(query, params);

    res.json({ reports: result.rows });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report details
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;

    const reportResult = await db.query(`
      SELECT dr.*, u.full_name as created_by_name
      FROM daily_reports dr
      LEFT JOIN users u ON dr.created_by = u.id
      WHERE dr.id = $1
    `, [reportId]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportItemsResult = await db.query(`
      SELECT * FROM report_items WHERE report_id = $1
      ORDER BY category, item_name
    `, [reportId]);

    const report = { ...reportResult.rows[0], items: reportItemsResult.rows };

    res.json({ report });

  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router; 
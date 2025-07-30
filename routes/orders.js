const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireWaiter, requireCook, requireBartender } = require('../middleware/auth');
// Socket.IO is available globally

const router = express.Router();

// Get all orders (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, table_number } = req.query;
    const userRole = req.user.role;
    
    let query = `
        SELECT o.*, u.full_name as waiter_name,
              string_agg(mi.name || ' (' || oi.quantity || ')', ', ') as items_summary
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE 1=1
      `;
    const params = [];
    let paramIndex = 1;

    // Filter by user role
    if (userRole === 'waiter') {
      query += ` AND o.waiter_id = $${paramIndex++}`;
      params.push(req.user.id);
    } else if (userRole === 'cook') {
      query += ` AND EXISTS (
        SELECT 1 FROM order_items oi2
        JOIN menu_items mi2 ON oi2.menu_item_id = mi2.id
        WHERE oi2.order_id = o.id AND mi2.category = 'food'
      )`;
    } else if (userRole === 'bartender') {
      query += ` AND EXISTS (
        SELECT 1 FROM order_items oi2
        JOIN menu_items mi2 ON oi2.menu_item_id = mi2.id
        WHERE oi2.order_id = o.id AND mi2.category = 'drink'
      )`;
    }
    

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        query += ` AND o.status = $${paramIndex++}`;
        params.push(status);
      } else {
        const placeholders = statuses.map(() => `$${paramIndex++}`).join(',');
        query += ` AND o.status IN (${placeholders})`;
        params.push(...statuses);
      }
    }
    

    if (table_number) {
      query += ` AND o.table_number = $${paramIndex++}`;
      params.push(table_number);
    }

    query += ` GROUP BY o.id, u.full_name ORDER BY o.created_at DESC`;

    const ordersResult = await db.query(query, params);
    const orders = ordersResult.rows;
    
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const orderItemsResult = await db.query(
          `
          SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = $1
          ORDER BY mi.category, mi.name
          `,
          [order.id]
        );

        let filteredItems = orderItemsResult.rows;
        if (userRole === 'cook') {
          filteredItems = filteredItems.filter(item => item.category === 'food');
        } else if (userRole === 'bartender') {
          filteredItems = filteredItems.filter(item => item.category === 'drink');
        }

        return { ...order, items: filteredItems };
      })
    );

    res.json({ orders: ordersWithItems });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID with details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Dohvati detalje narudžbe
    const orderResult = await db.query(`
      SELECT o.*, u.full_name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Provjeri dozvolu pristupa za konobara
    if (userRole === 'waiter' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Dohvati stavke narudžbe
    const orderItemsResult = await db.query(`
      SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY mi.category, mi.name
    `, [id]);

    let filteredItems = orderItemsResult.rows;

    if (userRole === 'cook') {
      filteredItems = filteredItems.filter(item => item.category === 'food');
    } else if (userRole === 'bartender') {
      filteredItems = filteredItems.filter(item => item.category === 'drink');
    }

    res.json({ 
      order: { ...order, items: filteredItems }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new order
router.post('/', authenticateToken, requireWaiter, async (req, res) => {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    const { table_number, items, notes } = req.body;
    
    if (!table_number || !items || items.length === 0) {
      return res.status(400).json({ error: 'Table number and items are required' });
    }
    
    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (table_number, waiter_id, status, notes, total_amount)
       VALUES ($1, $2, 'pending', $3, 0)
       RETURNING id`,
      [table_number, req.user.id, notes || '']
    );
    
    const orderId = orderResult.rows[0].id;
    let totalAmount = 0;
    
    // Insert order items
    for (const item of items) {
      const menuItemResult = await client.query(
        'SELECT price FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );
      
      if (menuItemResult.rows.length === 0) {
        throw new Error(`Menu item ${item.menu_item_id} not found`);
      }
      
      const itemPrice = menuItemResult.rows[0].price;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;
      
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes, size, variation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          item.menu_item_id,
          item.quantity,
          itemPrice,
          item.notes || '',
          item.size || null,
          item.variation || null
        ]
      );
    }
    
    // Update total amount
    await client.query(
      'UPDATE orders SET total_amount = $1 WHERE id = $2',
      [totalAmount, orderId]
    );
    
    await client.query('COMMIT');
    
    // Fetch full order with waiter name
    const ordersResult = await client.query(`
      SELECT o.*, u.full_name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = $1
    `, [orderId]);
    
    // Fetch order items with menu details
    const orderItemsResult = await client.query(`
      SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
      ORDER BY mi.category, mi.name
    `, [orderId]);
    
    const order = { ...ordersResult.rows[0], items: orderItemsResult.rows };
    
    // Emit socket events if global.io available
    if (global.io) {
      const hasFood = order.items.some(item => item.category === 'food');
      const hasDrinks = order.items.some(item => item.category === 'drink');
      
      if (hasFood) {
        global.io.to('cook').emit('new-order', { ...order, type: 'food' });
      }
      if (hasDrinks) {
        global.io.to('bartender').emit('new-order', { ...order, type: 'drink' });
      }
      
      global.io.to('waiter').emit('order-confirmation', order);
    }
    
    res.status(201).json({ 
      message: 'Order created successfully',
      order 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// Update order status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get order
    const ordersResult = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = ordersResult.rows[0];

    // Check permissions
    if (userRole === 'waiter' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update order status
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, id]
    );

    // Emit socket event
    if (global.io) {
      global.io.emit('order-status-update', { orderId: id, status, updatedBy: req.user.id });
    }

    res.json({ 
      message: 'Order status updated successfully',
      status
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Update order item status
router.patch('/:orderId/items/:itemId/status', authenticateToken, async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status, reason } = req.body;
    const userRole = req.user.role;
    
    const validStatuses = ['pending', 'preparing', 'ready', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    if (status === 'cancelled' && userRole !== 'waiter' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only waiters and admins can cancel items' });
    }
    
    let updateQuery = `
      UPDATE order_items 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [status];
    let paramIndex = 2;
    
    if (status === 'cancelled') {
      updateQuery += `, cancelled_at = CURRENT_TIMESTAMP, cancelled_by = $${paramIndex++}, cancelled_reason = $${paramIndex++}`;
      params.push(req.user.id, reason || '');
    }
    
    updateQuery += ` WHERE id = $${paramIndex++} AND order_id = $${paramIndex}`;
    params.push(itemId, orderId);
    
    const result = await db.query(updateQuery, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    
    // Check if all items in order are ready or cancelled
    const orderItemsResult = await db.query(
      'SELECT status FROM order_items WHERE order_id = $1',
      [orderId]
    );
    
    const allItemsProcessed = orderItemsResult.rows.every(item => 
      item.status === 'ready' || item.status === 'cancelled'
    );
    
    if (allItemsProcessed) {
      await db.query(
        `UPDATE orders SET status = 'served', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
    }
    
    // Emit socket event
    if (global.io) {
      global.io.emit('status-update', { orderId, itemId, status, reason });
      
      if (status === 'ready') {
        const itemDetailsResult = await db.query(`
          SELECT oi.*, mi.name as item_name, o.table_number
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.id = $1
        `, [itemId]);
        
        if (itemDetailsResult.rows.length > 0) {
          const item = itemDetailsResult.rows[0];
          global.io.to('waiter').emit('item-ready', { 
            order_id: orderId, 
            item_id: itemId,
            item_name: item.item_name,
            table_number: item.table_number
          });
        }
      }
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel order
router.put('/:id/cancel', authenticateToken, requireWaiter, async (req, res) => {
  try {
    const orderId = req.params.id;
    const waiterId = req.user.id;

    // Check if order exists and belongs to this waiter
    const ordersResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND waiter_id = $2',
      [orderId, waiterId]
    );

    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ error: 'Narudžba nije pronađena' });
    }

    const order = ordersResult.rows[0];

    // Update order status to cancelled
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['cancelled', orderId]
    );

    // Update all order items to cancelled
    await db.query(
      'UPDATE order_items SET status = $1, cancelled_at = NOW(), cancelled_by = $2 WHERE order_id = $3',
      ['cancelled', waiterId, orderId]
    );

    // Emit socket event to notify other users
    if (global.io) {
      global.io.to('waiter').to('cook').to('bartender').emit('order-cancelled', {
        order_id: orderId,
        table_number: order.table_number,
        waiter_id: waiterId
      });
    }

    res.json({ message: 'Narudžba otkazana' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Greška pri otkazivanju narudžbe' });
  }
});

// Mark order as served
router.put('/:id/serve', authenticateToken, requireWaiter, async (req, res) => {
  try {
    const orderId = req.params.id;
    const waiterId = req.user.id;

    // Check if order exists and belongs to this waiter
    const ordersResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND waiter_id = $2',
      [orderId, waiterId]
    );

    if (ordersResult.rows.length === 0) {
      return res.status(404).json({ error: 'Narudžba nije pronađena' });
    }

    const order = ordersResult.rows[0];

    // Update order status to served
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['served', orderId]
    );

    // Emit socket event to notify other users
    if (global.io) {
      global.io.to('waiter').to('cook').to('bartender').emit('order-completed', {
        order_id: orderId,
        table_number: order.table_number,
        waiter_id: waiterId
      });
    }

    res.json({ message: 'Narudžba označena kao poslužena' });
  } catch (error) {
    console.error('Error marking order as served:', error);
    res.status(500).json({ error: 'Greška pri označavanju narudžbe' });
  }
});

module.exports = router; 
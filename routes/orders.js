const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireWaiter, requireCook, requireBartender, requireStaff } = require('../middleware/auth');
// Socket.IO is available globally

const router = express.Router();

// Get all orders (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, table_number } = req.query;
    const userRole = req.user.role;
    
    let query = `
      SELECT o.*, u.name as waiter_name,
             GROUP_CONCAT(
               CONCAT(mi.name, ' (', oi.quantity, ')') SEPARATOR ', '
             ) as items_summary
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by user role
    if (userRole === 'waiter') {
      query += ' AND o.waiter_id = ?';
      params.push(req.user.id);
    } else if (userRole === 'cook') {
      query += ' AND EXISTS (SELECT 1 FROM order_items oi2 JOIN menu_items mi2 ON oi2.menu_item_id = mi2.id WHERE oi2.order_id = o.id AND mi2.category = "food")';
    } else if (userRole === 'bartender') {
      query += ' AND EXISTS (SELECT 1 FROM order_items oi2 JOIN menu_items mi2 ON oi2.menu_item_id = mi2.id WHERE oi2.order_id = o.id AND mi2.category = "drink")';
    }

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        query += ' AND o.status = ?';
        params.push(status);
      } else {
        query += ' AND o.status IN (' + statuses.map(() => '?').join(',') + ')';
        params.push(...statuses);
      }
    }

    if (table_number) {
      query += ' AND o.table_number = ?';
      params.push(table_number);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const [orders] = await db.execute(query, params);
    
    // Get items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [orderItems] = await db.execute(`
        SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = ?
        ORDER BY mi.category, mi.name
      `, [order.id]);
      
      // Filter items by role if needed
      let filteredItems = orderItems;
      if (userRole === 'cook') {
        filteredItems = orderItems.filter(item => item.category === 'food');
      } else if (userRole === 'bartender') {
        filteredItems = orderItems.filter(item => item.category === 'drink');
      }
      
      return { ...order, items: filteredItems };
    }));
    
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

    // Get order details
    const [orders] = await db.execute(`
      SELECT o.*, u.name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Check permissions
    if (userRole === 'waiter' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items
    const [orderItems] = await db.execute(`
      SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
      ORDER BY mi.category, mi.name
    `, [id]);

    // Filter items by role if needed
    let filteredItems = orderItems;
    if (userRole === 'cook') {
      filteredItems = orderItems.filter(item => item.category === 'food');
    } else if (userRole === 'bartender') {
      filteredItems = orderItems.filter(item => item.category === 'drink');
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
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { table_number, items, notes } = req.body;
    
    if (!table_number || !items || items.length === 0) {
      return res.status(400).json({ error: 'Table number and items are required' });
    }
    
    // Create order
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (table_number, waiter_id, status, total_amount)
      VALUES (?, ?, 'pending', 0)
    `, [table_number, req.user.id]);
    
    const orderId = orderResult.insertId;
    let totalAmount = 0;
    
    // Add order items
    for (const item of items) {
      const [menuItem] = await connection.execute(
        'SELECT price FROM menu_items WHERE id = ?',
        [item.menu_item_id]
      );
      
      if (menuItem.length === 0) {
        throw new Error(`Menu item ${item.menu_item_id} not found`);
      }
      
      const itemPrice = menuItem[0].price;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;
      
      await connection.execute(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, notes, size, variation)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        orderId, 
        item.menu_item_id, 
        item.quantity, 
        item.notes || '',
        item.size || null,
        item.variation || null
      ]);
    }
    
    // Update order total
    await connection.execute(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [totalAmount, orderId]
    );
    
    await connection.commit();
    
    // Get complete order with items
    const [orders] = await connection.execute(`
      SELECT o.*, u.name as waiter_name
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = ?
    `, [orderId]);
    
    const [orderItems] = await connection.execute(`
      SELECT oi.*, mi.name, mi.description, mi.category, mi.subcategory
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
      ORDER BY mi.category, mi.name
    `, [orderId]);
    
    const order = { ...orders[0], items: orderItems };
    
    // Emit socket event for real-time updates
    if (global.io) {
      // Check if order contains food items
      const hasFood = orderItems.some(item => item.category === 'food');
      // Check if order contains drink items
      const hasDrinks = orderItems.some(item => item.category === 'drink');
      
      // Emit to appropriate rooms
      if (hasFood) {
        global.io.to('cook').emit('new-order', { ...order, type: 'food' });
      }
      if (hasDrinks) {
        global.io.to('bartender').emit('new-order', { ...order, type: 'drink' });
      }
      
      // Also emit to waiter for confirmation
      global.io.to('waiter').emit('order-confirmation', order);
    }
    
    res.status(201).json({ 
      message: 'Order created successfully',
      order 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    if (!['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get order
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Check permissions
    if (userRole === 'waiter' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update order status
    await db.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
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
    
    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check permissions - allow waiters, cooks, bartenders and admins to cancel items
    if (status === 'cancelled' && userRole !== 'waiter' && userRole !== 'cook' && userRole !== 'bartender' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only waiters, cooks, bartenders and admins can cancel items' });
    }
    
    // Update item status
    let updateQuery = 'UPDATE order_items SET status = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [status, itemId];
    
    if (status === 'cancelled') {
      updateQuery += ', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, cancelled_reason = ?';
      params = [status, req.user.id, reason || '', itemId];
    }
    
    updateQuery += ' WHERE id = ? AND order_id = ?';
    params.push(orderId);
    
    const [result] = await db.execute(updateQuery, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    
    // Check if all items in order are ready or cancelled
    const [orderItems] = await db.execute(`
      SELECT status FROM order_items WHERE order_id = ?
    `, [orderId]);
    
    const allItemsProcessed = orderItems.every(item => 
      item.status === 'ready' || item.status === 'cancelled'
    );
    
    if (allItemsProcessed) {
      await db.execute(`
        UPDATE orders SET status = 'served', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [orderId]);
    }
    
    // Emit socket event
    if (global.io) {
      global.io.emit('status-update', { orderId, itemId, status, reason });
      
      // Notify waiter if item is ready
      if (status === 'ready') {
        // Get item details for notification
        const [itemDetails] = await db.execute(`
          SELECT oi.*, mi.name as item_name, o.table_number
          FROM order_items oi
          JOIN menu_items mi ON oi.menu_item_id = mi.id
          JOIN orders o ON oi.order_id = o.id
          WHERE oi.id = ?
        `, [itemId]);
        
        if (itemDetails.length > 0) {
          const item = itemDetails[0];
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
router.put('/:id/cancel', authenticateToken, requireStaff, async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;
        
        // Check if order exists
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Narudžba nije pronađena' });
        }
        
        const order = orders[0];
        
        // Update order status to cancelled
        await db.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            ['cancelled', orderId]
        );
        
        // Update all order items to cancelled
        await db.execute(
            'UPDATE order_items SET status = ?, cancelled_at = NOW(), cancelled_by = ? WHERE order_id = ?',
            ['cancelled', userId, orderId]
        );
        
        // Emit socket event to notify other users
        if (global.io) {
            global.io.to('waiter').to('cook').to('bartender').emit('order-cancelled', {
                order_id: orderId,
                table_number: order.table_number,
                cancelled_by: userId
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
        const [orders] = await db.execute(
            'SELECT * FROM orders WHERE id = ? AND waiter_id = ?',
            [orderId, waiterId]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Narudžba nije pronađena' });
        }
        
        const order = orders[0];
        
        // Update order status to served
        await db.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
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
const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Get all menu items (public endpoint - no auth required)
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, available } = req.query;
    
    let query = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (subcategory) {
      query += ' AND subcategory = ?';
      params.push(subcategory);
    }

    if (available !== undefined) {
      query += ' AND is_available = ?';
      params.push(available === 'true');
    }

    query += ' ORDER BY category, subcategory, name';

    const [items] = await db.execute(query, params);
    
    res.json({ items });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [items] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ item: items[0] });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu categories
router.get('/categories/list', async (req, res) => {
  try {
    const [categories] = await db.execute(
      'SELECT DISTINCT category, subcategory FROM menu_items WHERE is_available = true ORDER BY category, subcategory'
    );

    // Group by category
    const groupedCategories = categories.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      if (!acc[item.category].includes(item.subcategory)) {
        acc[item.category].push(item.subcategory);
      }
      return acc;
    }, {});

    res.json({ categories: groupedCategories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new menu item (admin only)
router.post('/', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { name, description, price, category, subcategory, image_url } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price and category are required' });
    }

    if (!['food', 'drink'].includes(category)) {
      return res.status(400).json({ error: 'Category must be either "food" or "drink"' });
    }

    const [result] = await db.execute(
      'INSERT INTO menu_items (name, description, price, category, subcategory, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, category, subcategory, image_url]
    );

    const [newItem] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Menu item created successfully',
      item: newItem[0]
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu item (admin only)
router.put('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, subcategory, is_available, image_url } = req.body;

    // Check if item exists
    const [existingItems] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    if (existingItems.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Update item
    await db.execute(
      'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, subcategory = ?, is_available = ?, image_url = ? WHERE id = ?',
      [name, description, price, category, subcategory, is_available, image_url, id]
    );

    const [updatedItem] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    res.json({ 
      message: 'Menu item updated successfully',
      item: updatedItem[0]
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu item (admin only)
router.delete('/:id', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const [existingItems] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    if (existingItems.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if item is used in any orders
    const [orderItems] = await db.execute(
      'SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?',
      [id]
    );

    if (orderItems[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete menu item that is used in orders. Set it as unavailable instead.' 
      });
    }

    await db.execute('DELETE FROM menu_items WHERE id = ?', [id]);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle menu item availability
router.patch('/:id/toggle-availability', authenticateToken, requireStaff, async (req, res) => {
  try {
    const { id } = req.params;

    const [existingItems] = await db.execute(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    if (existingItems.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const currentStatus = existingItems[0].is_available;
    const newStatus = !currentStatus;

    await db.execute(
      'UPDATE menu_items SET is_available = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({ 
      message: `Menu item ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_available: newStatus
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
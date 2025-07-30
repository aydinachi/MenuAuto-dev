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
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (subcategory) {
      params.push(subcategory);
      query += ` AND subcategory = $${params.length}`;
    }

    if (available !== undefined) {
      params.push(available === 'true');
      query += ` AND is_available = $${params.length}`;
    }

    query += ' ORDER BY category, subcategory, name';

    const result = await db.query(query, params);

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get menu categories
router.get('/categories/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category, subcategory FROM menu_items WHERE is_available = true ORDER BY category, subcategory'
    );

    const categories = result.rows;

    const grouped = categories.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      if (!acc[row.category].includes(row.subcategory)) {
        acc[row.category].push(row.subcategory);
      }
      return acc;
    }, {});

    res.json({ categories: grouped });
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

    const insertResult = await db.query(
      `INSERT INTO menu_items 
        (name, description, price, category, subcategory, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, description, price, category, subcategory, image_url]
    );

    res.status(201).json({
      message: 'Menu item created successfully',
      item: insertResult.rows[0]
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

    const check = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await db.query(
      `UPDATE menu_items 
       SET name = $1, description = $2, price = $3, category = $4, subcategory = $5, is_available = $6, image_url = $7 
       WHERE id = $8`,
      [name, description, price, category, subcategory, is_available, image_url, id]
    );

    const updated = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);

    res.json({
      message: 'Menu item updated successfully',
      item: updated.rows[0]
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

    const check = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const orders = await db.query(
      'SELECT COUNT(*) AS count FROM order_items WHERE menu_item_id = $1',
      [id]
    );

    if (parseInt(orders.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete menu item that is used in orders. Set it as unavailable instead.'
      });
    }

    await db.query('DELETE FROM menu_items WHERE id = $1', [id]);

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

    const result = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const current = result.rows[0].is_available;
    const newStatus = !current;

    await db.query(
      'UPDATE menu_items SET is_available = $1 WHERE id = $2',
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
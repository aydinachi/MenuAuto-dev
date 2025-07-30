const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users ORDER BY role, full_name'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['waiter', 'cook', 'bartender', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await db.query(
      'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hashedPassword, full_name, role]
    );

    const userId = insertResult.rows[0].id;

    const userResult = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, full_name, role } = req.body;
    const { id } = req.params;

    if (!username || !full_name || !role) {
      return res.status(400).json({ error: 'Username, full name and role are required' });
    }

    if (!['waiter', 'cook', 'bartender', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const userCheck = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const duplicateCheck = await db.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await db.query(
      'UPDATE users SET username = $1, full_name = $2, role = $3 WHERE id = $4',
      [username, full_name, role, id]
    );

    const updated = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [id]
    );

    res.json({
      message: 'User updated successfully',
      user: updated.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existing.rows[0].role === 'admin') {
      const adminCount = await db.query(
        `SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    const activeOrders = await db.query(
      `SELECT COUNT(*) AS count FROM orders WHERE waiter_id = $1 AND status NOT IN ('served', 'cancelled')`,
      [id]
    );

    if (parseInt(activeOrders.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete user with active orders. Complete or cancel their orders first.'
      });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.patch('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users by role
router.get('/role/:role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;

    if (!['waiter', 'cook', 'bartender', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE role = $1 ORDER BY full_name',
      [role]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
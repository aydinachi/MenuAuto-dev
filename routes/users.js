const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, full_name, role, created_at FROM users ORDER BY role, full_name'
    );
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await db.execute(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
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

    // Check if username already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, full_name, role]
    );

    const [newUser] = await db.execute(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'User created successfully',
      user: newUser[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, role } = req.body;

    if (!username || !full_name || !role) {
      return res.status(400).json({ error: 'Username, full name and role are required' });
    }

    if (!['waiter', 'cook', 'bartender', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username already exists (excluding current user)
    const [duplicateUsers] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, id]
    );

    if (duplicateUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Update user
    await db.execute(
      'UPDATE users SET username = ?, full_name = ?, role = ? WHERE id = ?',
      [username, full_name, role, id]
    );

    const [updatedUser] = await db.execute(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    res.json({ 
      message: 'User updated successfully',
      user: updatedUser[0]
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

    // Check if user exists
    const [existingUsers] = await db.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last admin
    if (existingUsers[0].role === 'admin') {
      const [adminCount] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
      );

      if (adminCount[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Check if user has active orders
    const [activeOrders] = await db.execute(
      'SELECT COUNT(*) as count FROM orders WHERE waiter_id = ? AND status NOT IN ("served", "cancelled")',
      [id]
    );

    if (activeOrders[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active orders. Complete or cancel their orders first.' 
      });
    }

    // Delete user
    await db.execute('DELETE FROM users WHERE id = ?', [id]);

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

    // Check if user exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
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

    const [users] = await db.execute(
      'SELECT id, username, full_name, role, created_at FROM users WHERE role = ? ORDER BY full_name',
      [role]
    );
    
    res.json({ users });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 
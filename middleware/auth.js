const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user from database
    const result = await db.query(
      'SELECT id, username, full_name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    const users = result.rows;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user has specific role
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Specific role middlewares
const requireWaiter = authorizeRole(['waiter']);
const requireCook = authorizeRole(['cook']);
const requireBartender = authorizeRole(['bartender']);
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
const requireStaff = authorizeRole(['waiter', 'cook', 'bartender', 'admin']);

module.exports = {
  authenticateToken,
  authorizeRole,
  requireWaiter,
  requireCook,
  requireBartender,
  requireAdmin,
  requireStaff
}; 
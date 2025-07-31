const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔐 Auth Debug - Token:', token ? token.substring(0, 50) + '...' : 'No token');
  console.log('🔐 Auth Debug - JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

  if (!token) {
    console.log('❌ Auth Debug - No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ Auth Debug - Token verified:', decoded);
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, username, name, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    console.log('🔍 Auth Debug - Database users found:', users.length);

    if (users.length === 0) {
      console.log('❌ Auth Debug - No user found in database');
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    console.log('✅ Auth Debug - User authenticated:', req.user);
    next();
  } catch (error) {
    console.log('❌ Auth Debug - Token verification failed:', error.message);
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
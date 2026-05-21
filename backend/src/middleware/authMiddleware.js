const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }

    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }

    // Check if user is blocked or not approved (if author)
    if (req.user.role === 'author' && !req.user.isApproved) {
      res.status(403);
      throw new Error('Your author account is pending approval by an admin.');
    }

    next();
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect };

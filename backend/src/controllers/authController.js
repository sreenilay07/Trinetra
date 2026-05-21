const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const sendEmail = require('../utils/email');

const generateToken = (id, type = 'access') => {
  const secret = type === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
  const expiresIn = type === 'access' ? process.env.JWT_ACCESS_EXPIRES_IN : process.env.JWT_REFRESH_EXPIRES_IN;
  return jwt.sign({ id }, secret, { expiresIn });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const userRole = ['author', 'student'].includes(role) ? role : 'student';

  const user = await User.create({
    fullName,
    email,
    password,
    role: userRole
  });

  if (user) {
    // If author, notify admin
    if (user.role === 'author') {
      try {
        await sendEmail({
          email: process.env.SMTP_USER, // sending to admin
          subject: 'New Author Registration - Pending Approval',
          message: `A new author ${user.fullName} (${user.email}) has registered and is awaiting approval.`
        });
      } catch (err) {
        logger.error('Failed to send email to admin for new author', err);
      }
    }

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      token: generateToken(user._id)
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    if (user.role === 'author' && !user.isApproved) {
      res.status(403);
      throw new Error('Account pending admin approval');
    }

    if (user.isActive === false) {
      res.status(403);
      throw new Error('Account has been deactivated by the administrator');
    }

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      token: generateToken(user._id),
      refreshToken: generateToken(user._id, 'refresh')
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Refresh Token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401);
      throw new Error('Invalid refresh token');
    }

    res.json({
      token: generateToken(user._id),
      refreshToken: generateToken(user._id, 'refresh')
    });
  } catch (error) {
    res.status(401);
    throw new Error('Invalid refresh token');
  }
});

module.exports = {
  registerUser,
  loginUser,
  refreshToken
};

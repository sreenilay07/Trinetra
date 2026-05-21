const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/email');
const logger = require('../utils/logger');

// @desc    Get all pending authors
// @route   GET /api/admin/pending-authors
// @access  Private/Admin
const getPendingAuthors = asyncHandler(async (req, res) => {
  const authors = await User.find({ role: 'author', isApproved: false }).select('-password');
  res.json(authors);
});

// @desc    Approve author
// @route   PUT /api/admin/approve-author/:id
// @access  Private/Admin
const approveAuthor = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid Author ID format');
  }

  const author = await User.findById(req.params.id);

  if (!author || author.role !== 'author') {
    res.status(404);
    throw new Error('Author not found');
  }

  author.isApproved = true;
  await author.save();

  try {
    const htmlMessage = `
      <div style="background-color: #070a13; color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #0ea5e9; font-weight: 800; font-size: 1.8rem; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">
            TRINETRA SECURE PORTAL
          </h2>
          <span style="font-size: 0.8rem; color: #64748b; font-family: monospace;">SECURED EDUCATION // AUTHOR GATEWAY</span>
        </div>
        
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: center;">
          <h3 style="color: #10b981; margin-top: 0; font-size: 1.4rem; font-weight: 700;">
            🎉 Account Approval Confirmed
          </h3>
          <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0;">
            Congratulations <strong>${author.fullName}</strong>! Your application to become an authorized instructor on the TRINETRA secure testing engine has been approved by the administrator.
          </p>
        </div>

        <div style="background-color: #0b0f19; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
          <h4 style="color: #38bdf8; margin-top: 0; margin-bottom: 16px; font-size: 1.1rem; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
            🔑 Secured Instructor Access Details
          </h4>
          <div style="font-size: 0.9rem; line-height: 1.6; color: #cbd5e1;">
            <div style="margin-bottom: 10px;">
              👤 Registered Name: <strong style="color: #ffffff;">${author.fullName}</strong>
            </div>
            <div style="margin-bottom: 10px;">
              ✉️ Registered Email Address: <strong style="color: #ffffff;">${author.email}</strong>
            </div>
            <div style="margin-bottom: 10px;">
              🛡️ Authorized Role: <strong style="color: #38bdf8;">EXAM AUTHOR / INSTRUCTOR</strong>
            </div>
            <div style="margin-bottom: 10px;">
              🔒 Account Status: <strong style="color: #10b981;">VERIFIED & ACTIVE</strong>
            </div>
          </div>
        </div>

        <div style="background: rgba(239, 68, 68, 0.05); border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 30px;">
          <h4 style="color: #f87171; margin-top: 0; margin-bottom: 6px; font-size: 0.9rem; text-transform: uppercase; font-weight: 700;">
            ⚠️ Critical Security Directives
          </h4>
          <p style="color: #fca5a5; font-size: 0.8rem; margin: 0; line-height: 1.4;">
            Do not forward this message or share your access credentials with unauthorized persons. All student exam activities, questions created, and grading runs are cryptographically mapped to your unique author key.
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 700; font-size: 0.95rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(14,165,233,0.4);">
            Launch Instructor Console
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;" />
        <div style="text-align: center; font-size: 0.7rem; color: #475569; font-family: monospace; line-height: 1.4;">
          TRINETRA SYSTEM ENGINE // CONFIDENTIALITY DIRECTIVE<br />
          ALL ACTIONS LOGGED UNDER STRICT AUDIT RECORD
        </div>
      </div>
    `;

    await sendEmail({
      email: author.email,
      subject: 'TRINETRA - Author Account Approved',
      message: htmlMessage
    });
  } catch (error) {
    logger.error('Failed to send approval email', error);
  }

  res.json({ message: 'Author approved successfully', author });
});

// @desc    Reject author
// @route   PUT /api/admin/reject-author/:id
// @access  Private/Admin
const rejectAuthor = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid Author ID format');
  }

  const author = await User.findById(req.params.id);

  if (!author || author.role !== 'author') {
    res.status(404);
    throw new Error('Author not found');
  }

  await User.deleteOne({ _id: req.params.id });

  try {
    await sendEmail({
      email: author.email,
      subject: 'TRINETRA - Author Account Rejected',
      message: `Hello ${author.fullName}, unfortunately your author account request has been rejected.`
    });
  } catch (error) {
    logger.error('Failed to send rejection email', error);
  }

  res.json({ message: 'Author rejected and removed successfully' });
});

// @desc    Get all users (students, authors, admins)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private/Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid User ID format');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({ message: `User status updated to ${user.isActive ? 'active' : 'inactive'}`, user });
});

module.exports = {
  getPendingAuthors,
  approveAuthor,
  rejectAuthor,
  getAllUsers,
  toggleUserStatus
};

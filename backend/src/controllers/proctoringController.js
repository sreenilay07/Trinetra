const Violation = require('../models/Violation');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const asyncHandler = require('../utils/asyncHandler');
const { getIo } = require('../sockets/socketManager');

// Suspicion score mapping
const VIOLATION_SCORES = {
  tab_switch: 10,
  multiple_faces: 30,
  no_face_detected: 20,
  face_turned: 15,
  mobile_detected: 40,
  voice_detected: 20,
  fullscreen_exit: 15,
  suspicious_behavior: 25
};

// @desc    Log a violation from AI frontend
// @route   POST /api/proctoring/violation
// @access  Private/Student
const logViolation = asyncHandler(async (req, res) => {
  const { attemptId, type, evidenceImage } = req.body;

  const attempt = await Attempt.findById(attemptId).populate('examId');

  if (!attempt || attempt.status !== 'active') {
    res.status(400);
    throw new Error('Invalid or inactive attempt');
  }

  const exam = attempt.examId;

  // Determine severity based on type
  let severity = 'low';
  if (['mobile_detected', 'multiple_faces'].includes(type)) {
    severity = 'high';
  } else if (['no_face_detected', 'voice_detected', 'suspicious_behavior'].includes(type)) {
    severity = 'medium';
  }

  // Count previous similar warnings
  const previousViolations = await Violation.countDocuments({ attemptId, type });
  const warningNumber = previousViolations + 1;

  const violation = await Violation.create({
    attemptId,
    type,
    evidenceImage,
    severity,
    warningNumber
  });

  // Update suspicion score
  attempt.suspicionScore += (VIOLATION_SCORES[type] || 0);
  attempt.violations.push(violation._id);
  await attempt.save();

  // Notify admin/proctor dashboard in real-time
  const io = getIo();
  if (io) {
    io.to(`exam_${exam._id}_admin`).emit('violation_detected', {
      studentId: attempt.studentId,
      examId: exam._id,
      violation
    });
  }

  // Auto Submission Logic
  let autoSubmitTriggered = false;
  if (warningNumber > exam.maxWarnings || attempt.suspicionScore >= 100) {
    // Terminate exam
    attempt.status = 'terminated';
    attempt.autoSubmitted = true;
    attempt.submittedAt = Date.now();
    await attempt.save();

    autoSubmitTriggered = true;

    if (io) {
      // Force submit via socket to client
      io.to(attempt.studentId.toString()).emit('auto_submit', {
        reason: 'Maximum warnings exceeded or high suspicion score.'
      });
    }
  } else {
    // Send warning to student via socket
    if (io) {
      io.to(attempt.studentId.toString()).emit('warning_issued', {
        type,
        message: `Warning ${warningNumber}: ${type.replace('_', ' ')} detected.`,
        warningNumber
      });
    }
  }

  res.status(201).json({
    violation,
    suspicionScore: attempt.suspicionScore,
    autoSubmitTriggered
  });
});

// @desc    Get violations for an attempt
// @route   GET /api/proctoring/violations/:attemptId
// @access  Private
const getViolations = asyncHandler(async (req, res) => {
  const violations = await Violation.find({ attemptId: req.params.attemptId }).sort({ timestamp: -1 });
  res.json(violations);
});

module.exports = {
  logViolation,
  getViolations
};

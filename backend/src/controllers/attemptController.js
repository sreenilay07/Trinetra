const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/email');

// @desc    Start an exam attempt
// @route   POST /api/attempts/start
// @access  Private/Student
const startAttempt = asyncHandler(async (req, res) => {
  const { examId } = req.body;
  const studentId = req.user._id;

  const exam = await Exam.findById(examId);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (!exam.isPublished) {
    res.status(400);
    throw new Error('Exam is not available');
  }

  // Check if it's within the timeframe
  const now = new Date();
  if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
    res.status(400);
    throw new Error('Exam is not currently active');
  }

  // CRITICAL: ONE ATTEMPT ONLY SYSTEM
  const existingAttempt = await Attempt.findOne({ studentId, examId });

  if (existingAttempt) {
    res.status(403);
    throw new Error('You have already attempted this exam. Multiple attempts are not allowed.');
  }

  const attempt = await Attempt.create({
    studentId,
    examId,
    status: 'active'
  });

  res.status(201).json({
    message: 'Exam attempt started successfully',
    attemptId: attempt._id
  });
});

// @desc    Submit an exam attempt
// @route   POST /api/attempts/submit
// @access  Private/Student
const submitAttempt = asyncHandler(async (req, res) => {
  const { attemptId, answers, isAutoSubmit, submissionReason } = req.body;

  const attempt = await Attempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  if (attempt.studentId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (attempt.status !== 'active') {
    res.status(400);
    throw new Error('Exam already submitted or terminated');
  }

  // Calculate score (simple auto-grading for MCQs)
  let totalScore = 0;
  const formattedAnswers = [];
  const answersArray = Array.isArray(answers) ? answers : [];

  for (let ans of answersArray) {
    if (!ans.questionId || !mongoose.Types.ObjectId.isValid(ans.questionId)) {
      continue;
    }
    const question = await Question.findById(ans.questionId);
    let marksObtained = 0;

    if (question && question.type === 'mcq') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption && correctOption.text === ans.answer) {
        marksObtained = question.marks;
      }
    } else if (question && question.type === 'coding') {
      marksObtained = ans.marksObtained || 0;
    }
    totalScore += marksObtained;

    formattedAnswers.push({
      questionId: ans.questionId,
      answer: ans.answer,
      marksObtained
    });
  }

  attempt.answers = formattedAnswers;
  attempt.score = totalScore;
  attempt.status = 'submitted';
  attempt.submittedAt = Date.now();
  attempt.autoSubmitted = isAutoSubmit || false;
  attempt.submissionReason = submissionReason || (isAutoSubmit ? 'Auto submitted due to proctoring violation' : 'Standard manual submission');

  await attempt.save();

  // Send email notification with detailed report
  try {
    let questionsBreakdownHtml = '';
    const examDetails = await Exam.findById(attempt.examId);
    
    for (let idx = 0; idx < formattedAnswers.length; idx++) {
      const ans = formattedAnswers[idx];
      const question = await Question.findById(ans.questionId);
      if (question) {
        const correctStr = question.type === 'mcq' 
          ? (question.options.find(opt => opt.isCorrect)?.text || 'N/A')
          : 'Coding Evaluation / Expected Testcases';
        
        questionsBreakdownHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; font-weight: bold; color: #1e293b;">Q${idx + 1}: ${question.question}</td>
            <td style="padding: 12px; color: #475569;">${ans.answer || 'No Answer'}</td>
            <td style="padding: 12px; color: #15803d; font-weight: 600;">${correctStr}</td>
            <td style="padding: 12px; font-weight: bold; color: ${ans.marksObtained > 0 ? '#16a34a' : '#dc2626'};">${ans.marksObtained} / ${question.marks}</td>
          </tr>
        `;
      }
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 20px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0ea5e9; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">TRINETRA secure reports</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Automated Proctoring Assessment Receipt</p>
        </div>
        
        <p style="font-size: 16px; color: #334155; margin-bottom: 16px;">Hello <strong>${req.user.fullName}</strong>,</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 24px;">Your secured proctoring assessment has been successfully registered. Here is your evaluation receipt:</p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #166534; font-weight: 600;">Assessment:</td>
              <td style="padding: 6px 0; color: #14532d; font-weight: 700; text-align: right;">${examDetails ? examDetails.title : 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534; font-weight: 600;">Completed On:</td>
              <td style="padding: 6px 0; color: #14532d; font-weight: 700; text-align: right;">${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534; font-weight: 600;">Status:</td>
              <td style="padding: 6px 0; color: #14532d; font-weight: 700; text-align: right; text-transform: uppercase;">
                ${isAutoSubmit ? 'Forced/Auto Submitted' : 'Standard Submission'}
              </td>
            </tr>
            ${attempt.submissionReason ? `
            <tr>
              <td style="padding: 6px 0; color: #b91c1c; font-weight: 600;">Security Integrity Details:</td>
              <td style="padding: 6px 0; color: #7f1d1d; font-weight: 700; text-align: right;">
                ${attempt.submissionReason}
              </td>
            </tr>
            ` : ''}
            <tr style="border-top: 1px solid #bbf7d0;">
              <td style="padding: 12px 0 0 0; color: #166534; font-weight: 800; font-size: 16px;">Final Mark rating:</td>
              <td style="padding: 12px 0 0 0; color: #15803d; font-weight: 900; font-size: 20px; text-align: right;">${totalScore} / ${examDetails ? examDetails.totalMarks : 0} marks</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #1e293b; font-size: 16px; font-weight: 700; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Response Summary Roster</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
              <th style="padding: 10px; color: #475569; font-weight: 600;">Question Statement</th>
              <th style="padding: 10px; color: #475569; font-weight: 600;">Your Response</th>
              <th style="padding: 10px; color: #475569; font-weight: 600;">Correct Reference</th>
              <th style="padding: 10px; color: #475569; font-weight: 600;">Marks</th>
            </tr>
          </thead>
          <tbody>
            ${questionsBreakdownHtml || '<tr><td colspan="4" style="text-align: center; padding: 12px; color: #64748b;">No answer items graded.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This email serves as your official digital evaluation receipt.</p>
          <p style="margin: 4px 0 0 0;"><strong>TRINETRA AI Proctor Engine</strong> • Secured Integrity Validation</p>
        </div>
      </div>
    `;

    await sendEmail({
      email: req.user.email,
      subject: `TRINETRA Assessment Report - ${examDetails ? examDetails.title : 'Assessment'}`,
      message: emailHtml
    });
  } catch (error) {
    console.error('Email sending failed', error);
  }

  res.json({ message: 'Exam submitted successfully', attempt });
});

// @desc    Get result of an attempt
// @route   GET /api/attempts/result/:id
// @access  Private
const getResult = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findById(req.params.id)
    .populate('examId', 'title totalMarks duration')
    .populate('studentId', 'fullName email');

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Only student who took it, author of the exam, or admin can view
  const studentIdStr = attempt.studentId && attempt.studentId._id 
    ? attempt.studentId._id.toString() 
    : (attempt.studentId ? attempt.studentId.toString() : '');

  if (
    studentIdStr !== req.user._id.toString() &&
    req.user.role !== 'admin' &&
    req.user.role !== 'author'
  ) {
    res.status(403);
    throw new Error('Not authorized to view this result');
  }

  res.json(attempt);
});

// @desc    Get all attempts for an exam
// @route   GET /api/attempts/exam/:examId
// @access  Private/Author/Admin
const getAttemptsByExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  // Only author of the exam or admin can see all attempts
  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view attempts for this exam');
  }

  const attempts = await Attempt.find({ examId: req.params.examId })
    .populate('studentId', 'fullName email')
    .sort({ createdAt: -1 });

  res.json(attempts);
});

// @desc    Get all attempts of the logged-in student
// @route   GET /api/attempts/my-attempts
// @access  Private/Student
const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await Attempt.find({ studentId: req.user._id })
    .populate('examId', 'title totalMarks duration startTime endTime')
    .sort({ submittedAt: -1, createdAt: -1 });

  res.json(attempts);
});

module.exports = {
  startAttempt,
  submitAttempt,
  getResult,
  getAttemptsByExam,
  getMyAttempts
};

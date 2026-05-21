const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a new exam
// @route   POST /api/exams/create
// @access  Private/Author
const createExam = asyncHandler(async (req, res) => {
  const { title, description, examType, duration, startTime, endTime, totalMarks, instructions, rules } = req.body;

  const exam = await Exam.create({
    title,
    description,
    examType: examType || 'both',
    authorId: req.user._id,
    duration,
    startTime,
    endTime,
    totalMarks,
    instructions,
    rules
  });

  res.status(201).json(exam);
});

// @desc    Get all exams (Public/Student sees published, Admin/Author sees relevant)
// @route   GET /api/exams/all
// @access  Private
const getExams = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === 'student') {
    query.isPublished = true;
  } else if (req.user.role === 'author') {
    query.authorId = req.user._id;
  }
  // Admin sees all

  const exams = await Exam.find(query).populate('authorId', 'fullName email');
  res.json(exams);
});

// @desc    Get exam by ID
// @route   GET /api/exams/:id
// @access  Private
const getExamById = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate('authorId', 'fullName email');

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  // If student, check if published
  if (req.user.role === 'student' && !exam.isPublished) {
    res.status(403);
    throw new Error('This exam is not published yet');
  }

  // Get questions if authorized (Students shouldn't see answers, maybe separate route for taking exam)
  const questions = await Question.find({ examId: exam._id });

  res.json({ exam, questions });
});

// @desc    Update exam
// @route   PUT /api/exams/update/:id
// @access  Private/Author
const updateExam = asyncHandler(async (req, res) => {
  let exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this exam');
  }

  exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(exam);
});

// @desc    Delete exam
// @route   DELETE /api/exams/delete/:id
// @access  Private/Author
const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this exam');
  }

  await Question.deleteMany({ examId: exam._id });
  await Exam.deleteOne({ _id: exam._id });

  res.json({ message: 'Exam removed successfully' });
});

// --- QUESTION MANAGEMENT ---

// @desc    Add question to exam
// @route   POST /api/exams/questions/add
// @access  Private/Author
const addQuestion = asyncHandler(async (req, res) => {
  const { examId, type, question, options, correctAnswer, testCases, marks, difficultyLevel } = req.body;

  const exam = await Exam.findById(examId);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  const newQuestion = await Question.create({
    examId,
    type,
    question,
    options,
    correctAnswer,
    testCases,
    marks,
    difficultyLevel
  });

  // Update total marks in exam
  exam.totalMarks += marks;
  await exam.save();

  res.status(201).json(newQuestion);
});

// @desc    Reconduct exam (Reset/Delete student attempts for this exam)
// @route   POST /api/exams/reconduct/:id
// @access  Private/Author
const reconductExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  // Only author or admin
  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to reconduct this exam');
  }

  const { studentId } = req.body;

  if (studentId) {
    // Reconduct only for this specific student!
    const attempt = await Attempt.findOne({ examId: exam._id, studentId });
    if (attempt) {
      // Delete violations associated with this attempt
      try {
        const Violation = require('../models/Violation');
        await Violation.deleteMany({ attemptId: attempt._id });
      } catch (err) {
        console.error('Failed to delete violations for student:', err.message);
      }
      // Delete the attempt
      await Attempt.deleteOne({ _id: attempt._id });
      res.json({ message: 'Exam reset successfully for the selected student.' });
    } else {
      res.status(404);
      throw new Error('No assessment attempt found for the selected student.');
    }
  } else {
    // Find all attempts for this exam
    const attempts = await Attempt.find({ examId: exam._id });
    const attemptIds = attempts.map(att => att._id);

    // Delete all violations associated with these attempts
    try {
      const Violation = require('../models/Violation');
      await Violation.deleteMany({ attemptId: { $in: attemptIds } });
    } catch (err) {
      console.error('Failed to delete violations:', err.message);
    }

    // Delete attempts
    await Attempt.deleteMany({ examId: exam._id });

    res.json({ message: 'Exam reset successfully. All attempts have been cleared.' });
  }
});

// @desc    Update an existing question in an exam
// @route   PUT /api/exams/questions/update/:questionId
// @access  Private/Author
const updateQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const { type, question, options, correctAnswer, testCases, marks, difficultyLevel } = req.body;

  const q = await Question.findById(questionId);
  if (!q) {
    res.status(404);
    throw new Error('Question not found');
  }

  const exam = await Exam.findById(q.examId);
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update questions for this exam');
  }

  const oldMarks = q.marks;

  q.type = type || q.type;
  q.question = question || q.question;
  if (options) q.options = options;
  if (correctAnswer !== undefined) q.correctAnswer = correctAnswer;
  if (testCases) q.testCases = testCases;
  if (marks !== undefined) q.marks = Number(marks);
  if (difficultyLevel) q.difficultyLevel = difficultyLevel;

  const updatedQuestion = await q.save();

  // Adjust exam total marks
  if (marks !== undefined && Number(marks) !== oldMarks) {
    exam.totalMarks = exam.totalMarks - oldMarks + Number(marks);
    await exam.save();
  }

  res.json(updatedQuestion);
});

// @desc    Delete an existing question from an exam
// @route   DELETE /api/exams/questions/delete/:questionId
// @access  Private/Author
const deleteQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;

  const q = await Question.findById(questionId);
  if (!q) {
    res.status(404);
    throw new Error('Question not found');
  }

  const exam = await Exam.findById(q.examId);
  if (!exam) {
    res.status(404);
    throw new Error('Exam not found');
  }

  if (exam.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete questions from this exam');
  }

  const marks = q.marks;
  await Question.deleteOne({ _id: questionId });

  // Adjust exam total marks
  exam.totalMarks = Math.max(0, exam.totalMarks - marks);
  await exam.save();

  res.json({ message: 'Question deleted successfully', questionId });
});

// @desc    Get Gemini API Key configuration status
// @route   GET /api/exams/settings/gemini
// @access  Private/Author
const getGeminiKeyStatus = asyncHandler(async (req, res) => {
  let isConfigured = false;
  let source = '';
  let maskedKey = '';

  if (process.env.GEMINI_API_KEY) {
    isConfigured = true;
    source = 'env';
    maskedKey = 'Configured via Server Environment Variable';
  } else {
    const SystemSetting = require('../models/SystemSetting');
    const setting = await SystemSetting.findOne({ key: 'GEMINI_API_KEY' });
    if (setting && setting.value) {
      isConfigured = true;
      source = 'db';
      const keyVal = setting.value;
      maskedKey = keyVal.length > 8 
        ? `${keyVal.substring(0, 6)}...${keyVal.substring(keyVal.length - 4)}` 
        : 'Configured';
    }
  }

  res.json({ isConfigured, source, maskedKey });
});

// @desc    Save Gemini API Key to database settings
// @route   POST /api/exams/settings/gemini
// @access  Private/Author
const saveGeminiKey = asyncHandler(async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    res.status(400);
    throw new Error('API Key is required');
  }

  const SystemSetting = require('../models/SystemSetting');
  let setting = await SystemSetting.findOne({ key: 'GEMINI_API_KEY' });

  if (setting) {
    setting.value = apiKey;
    await setting.save();
  } else {
    setting = await SystemSetting.create({
      key: 'GEMINI_API_KEY',
      value: apiKey
    });
  }

  res.json({ message: 'Gemini API Key saved successfully', isConfigured: true });
});

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  addQuestion,
  reconductExam,
  updateQuestion,
  deleteQuestion,
  getGeminiKeyStatus,
  saveGeminiKey
};

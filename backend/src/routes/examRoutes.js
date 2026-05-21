const express = require('express');
const router = express.Router();
const { createExam, getExams, getExamById, updateExam, deleteExam, addQuestion, reconductExam, updateQuestion, deleteQuestion, getGeminiKeyStatus, saveGeminiKey } = require('../controllers/examController');
const { evaluateCode } = require('../controllers/evaluationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/all', getExams);
router.get('/:id', getExamById);
router.post('/evaluate-code', evaluateCode);

// Author & Admin only routes
router.use(authorize('author', 'admin'));

router.post('/create', createExam);
router.put('/update/:id', updateExam);
router.delete('/delete/:id', deleteExam);
router.post('/reconduct/:id', reconductExam);

// Gemini API Key Settings
router.get('/settings/gemini', getGeminiKeyStatus);
router.post('/settings/gemini', saveGeminiKey);

// Questions
router.post('/questions/add', addQuestion);
router.put('/questions/update/:questionId', updateQuestion);
router.delete('/questions/delete/:questionId', deleteQuestion);

module.exports = router;

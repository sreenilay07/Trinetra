const express = require('express');
const router = express.Router();
const { startAttempt, submitAttempt, getResult, getAttemptsByExam, getMyAttempts } = require('../controllers/attemptController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/start', authorize('student'), startAttempt);
router.post('/submit', submitAttempt);
router.get('/my-attempts', authorize('student'), getMyAttempts);
router.get('/result/:id', getResult);
router.get('/exam/:examId', authorize('author', 'admin'), getAttemptsByExam);

module.exports = router;

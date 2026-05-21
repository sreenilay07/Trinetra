const express = require('express');
const router = express.Router();
const { logViolation, getViolations } = require('../controllers/proctoringController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/violation', logViolation);
router.get('/violations/:attemptId', authorize('admin', 'author'), getViolations);

module.exports = router;

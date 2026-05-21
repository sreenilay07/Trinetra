const express = require('express');
const router = express.Router();
const { getPendingAuthors, approveAuthor, rejectAuthor, getAllUsers, toggleUserStatus } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/pending-authors', getPendingAuthors);
router.put('/approve-author/:id', approveAuthor);
router.put('/reject-author/:id', rejectAuthor);

router.get('/users', getAllUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

module.exports = router;

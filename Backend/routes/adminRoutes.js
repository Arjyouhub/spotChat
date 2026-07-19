const express = require('express');
const {
  getSystemAnalytics,
  getAllUsersAdmin,
  toggleBlockUser,
  getReports,
  createReport,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/analytics', protect, getSystemAnalytics);
router.get('/users', protect, getAllUsersAdmin);
router.put('/user-block/:id', protect, toggleBlockUser);
router.get('/reports', protect, getReports);
router.post('/report', protect, createReport);

module.exports = router;

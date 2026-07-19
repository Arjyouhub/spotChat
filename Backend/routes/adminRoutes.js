const express = require('express');
const {
  getSystemAnalytics,
  getAllUsersAdmin,
  toggleBlockUser,
  getReports,
  createReport,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/analytics', protect, adminOnly, getSystemAnalytics);
router.get('/users', protect, adminOnly, getAllUsersAdmin);
router.put('/user-block/:id', protect, adminOnly, toggleBlockUser);
router.get('/reports', protect, adminOnly, getReports);
router.post('/report', protect, createReport);

module.exports = router;

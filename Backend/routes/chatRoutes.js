const express = require('express');
const {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  updateDisappearingTimer,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, accessChat).get(protect, fetchChats);
router.post('/group', protect, createGroupChat);
router.put('/group-rename', protect, renameGroup);
router.put('/group-add', protect, addToGroup);
router.put('/group-remove', protect, removeFromGroup);
router.put('/disappearing', protect, updateDisappearingTimer);

module.exports = router;

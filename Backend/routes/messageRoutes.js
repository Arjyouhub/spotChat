const express = require('express');
const {
  sendMessage,
  allMessages,
  markViewOnceAsViewed,
  deleteMessageForMe,
  deleteMessageForEveryone,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').post(protect, sendMessage);
router.route('/:chatId').get(protect, allMessages);
router.put('/view-once/:messageId', protect, markViewOnceAsViewed);
router.put('/delete-me/:messageId', protect, deleteMessageForMe);
router.put('/delete-everyone/:messageId', protect, deleteMessageForEveryone);

module.exports = router;

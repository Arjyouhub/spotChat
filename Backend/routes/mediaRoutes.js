const express = require('express');
const multer = require('multer');
const { uploadMedia } = require('../controllers/mediaController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

router.post('/upload', protect, upload.single('file'), uploadMedia);

module.exports = router;

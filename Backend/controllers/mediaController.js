const cloudinary = require('../config/cloudinary');

const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.file;
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'demo_cloud' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY.length > 5 &&
      process.env.CLOUDINARY_API_SECRET;

    let mediaUrl = '';
    let mediaType = 'file';

    if (file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      mediaType = 'audio';
    }

    if (isCloudinaryConfigured) {
      try {
        const uploadStream = () => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: 'auto', folder: 'spotchat_media' },
              (error, result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(error);
                }
              }
            );
            stream.end(file.buffer);
          });
        };

        const result = await uploadStream();
        mediaUrl = result.secure_url;
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to base64 data URL:', cloudErr.message);
        const base64Data = file.buffer.toString('base64');
        mediaUrl = `data:${file.mimetype};base64,${base64Data}`;
      }
    } else {
      // Fallback: Data URL base64 representation
      const base64Data = file.buffer.toString('base64');
      mediaUrl = `data:${file.mimetype};base64,${base64Data}`;
    }

    res.json({
      mediaUrl,
      mediaType,
      filename: file.originalname,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message || 'Media upload failed' });
  }
};

module.exports = { uploadMedia };

const User = require('../models/User');

// @desc    Search or list users by username, name, or email
// @route   GET /api/users?search=
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const queryStr = req.query.search ? req.query.search.replace('@', '').trim() : '';

    const keyword = queryStr
      ? {
          $or: [
            { username: { $regex: queryStr, $options: 'i' } },
            { name: { $regex: queryStr, $options: 'i' } },
            { email: { $regex: queryStr, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } })
      .select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchUsers };

const User = require('../models/User');

// @desc    Search or list users by username, name, or email
// @route   GET /api/users?search=
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const rawQuery = req.query.search ? req.query.search.replace('@', '').trim() : '';

    if (!rawQuery || rawQuery.length < 2) {
      return res.json([]);
    }

    const keyword = {
      $or: [
        { username: { $regex: rawQuery, $options: 'i' } },
        { name: { $regex: rawQuery, $options: 'i' } },
        { email: { $regex: rawQuery, $options: 'i' } },
      ],
    };

    const blockedIds = req.user.blockedUsers || [];

    const users = await User.find(keyword)
      .find({
        _id: { $ne: req.user._id, $nin: blockedIds },
      })
      .select('-password')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchUsers };

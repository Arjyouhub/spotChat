const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Report = require('../models/Report');

// @desc    Get admin system analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getSystemAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const totalChats = await Chat.countDocuments();
    const totalMessages = await Message.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      onlineUsers,
      totalChats,
      totalMessages,
      pendingReports,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsersAdmin = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block or Unblock a user
// @route   PUT /api/admin/user-block/:id
// @access  Private/Admin
const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private/Admin
const getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email username avatar')
      .populate('reportedUser', 'name email username avatar')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a user report
// @route   POST /api/admin/report
// @access  Private
const createReport = async (req, res) => {
  try {
    const { reportedUserId, reason } = req.body;
    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: 'Please provide reported user and reason' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason,
    });

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSystemAnalytics,
  getAllUsersAdmin,
  toggleBlockUser,
  getReports,
  createReport,
};

const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Access or create 1-on-1 chat
// @route   POST /api/chats
// @access  Private
const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'UserId param not sent with request' });
    }

    let isChat = await Chat.find({
      isGroup: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'name avatar email',
    });

    if (isChat.length > 0) {
      res.json(isChat[0]);
    } else {
      const targetUser = await User.findById(userId);
      const chatData = {
        chatName: targetUser ? targetUser.name : 'Sender',
        isGroup: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password'
      );
      res.status(201).json(fullChat);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch all chats for logged in user
// @route   GET /api/chats
// @access  Private
const fetchChats = async (req, res) => {
  try {
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'name avatar email',
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = async (req, res) => {
  try {
    if (!req.body.users || !req.body.name) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    let users = typeof req.body.users === 'string' ? JSON.parse(req.body.users) : req.body.users;

    if (users.length < 1) {
      return res.status(400).json({ message: 'At least 1 other user is required to form a group chat' });
    }

    users.push(req.user._id);

    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroup: true,
      groupAdmin: req.user._id,
      groupAvatar: req.body.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(req.body.name)}`,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rename group
// @route   PUT /api/chats/group-rename
// @access  Private
const renameGroup = async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat Not Found' });
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to group
// @route   PUT /api/chats/group-add
// @access  Private
const addToGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!added) {
      return res.status(404).json({ message: 'Chat Not Found' });
    }

    res.json(added);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from group
// @route   PUT /api/chats/group-remove
// @access  Private
const removeFromGroup = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!removed) {
      return res.status(404).json({ message: 'Chat Not Found' });
    }

    res.json(removed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update disappearing message timer for chat
// @route   PUT /api/chats/disappearing
// @access  Private
const updateDisappearingTimer = async (req, res) => {
  try {
    const { chatId, duration } = req.body; // duration in seconds (0 = disabled)

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { disappearingDuration: duration },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear chat history for current user
// @route   DELETE /api/chats/clear/:chatId
// @access  Private
const clearChat = async (req, res) => {
  try {
    const Message = require('../models/Message');
    const { chatId } = req.params;

    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { deletedFor: req.user._id } }
    );

    res.json({ message: 'Chat history cleared successfully', chatId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete chat permanently
// @route   DELETE /api/chats/:chatId
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const Message = require('../models/Message');
    const { chatId } = req.params;

    await Message.deleteMany({ chat: chatId });
    await Chat.findByIdAndDelete(chatId);

    res.json({ message: 'Chat deleted permanently', chatId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  updateDisappearingTimer,
  clearChat,
  deleteChat,
};

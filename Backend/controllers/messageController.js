const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, mediaUrl, mediaType, isViewOnce } = req.body;

    if (!chatId || (!content && !mediaUrl)) {
      return res.status(400).json({ message: 'Invalid payload sent for message' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    let expireAt = null;
    if (chat.disappearingDuration && chat.disappearingDuration > 0) {
      expireAt = new Date(Date.now() + chat.disappearingDuration * 1000);
    }

    let newMessage = {
      sender: req.user._id,
      content: content || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || null,
      isViewOnce: !!isViewOnce,
      chat: chatId,
      readBy: [req.user._id],
      deliveredTo: [req.user._id],
      expireAt: expireAt,
    };

    let message = await Message.create(newMessage);

    message = await message.populate('sender', 'name avatar email');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'name avatar email isOnline lastSeen',
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const allMessages = async (req, res) => {
  try {
    let messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'name avatar email')
      .populate('chat')
      .sort({ createdAt: 1 });

    messages = await User.populate(messages, {
      path: 'chat.users',
      select: 'name username avatar email isOnline lastSeen',
    });

    // Mark messages as read by current user
    await Message.updateMany(
      { chat: req.params.chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id, deliveredTo: req.user._id } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark view-once message as viewed
// @route   PUT /api/messages/view-once/:messageId
// @access  Private
const markViewOnceAsViewed = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.isViewOnce) {
      message.isViewed = true;
      message.mediaUrl = ''; // Erase media URL permanently so it cannot be reopened or downloaded
      if (!message.viewedBy.includes(req.user._id)) {
        message.viewedBy.push(req.user._id);
      }
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete message for me
// @route   PUT /api/messages/delete-me/:messageId
// @access  Private
const deleteMessageForMe = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { deletedFor: req.user._id } },
      { new: true }
    );

    res.json({ message: 'Message deleted for you', messageId: req.params.messageId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete message for everyone
// @route   PUT /api/messages/delete-everyone/:messageId
// @access  Private
const deleteMessageForEveryone = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
    }

    message.deletedForEveryone = true;
    message.content = 'This message was deleted';
    message.mediaUrl = '';
    message.mediaType = null;
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  allMessages,
  markViewOnceAsViewed,
  deleteMessageForMe,
  deleteMessageForEveryone,
};

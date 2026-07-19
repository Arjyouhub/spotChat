const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
      default: 'Sender',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAvatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/identicon/svg?seed=group',
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    disappearingDuration: {
      type: Number,
      default: 0, // 0 = disabled, e.g. 10 (10s), 60 (1m), 86400 (24h)
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Chat', chatSchema);

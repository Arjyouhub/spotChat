const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      default: 'video',
    },
    status: {
      type: String,
      enum: ['missed', 'answered', 'declined', 'ended'],
      default: 'missed',
    },
    duration: {
      type: Number,
      default: 0, // duration in seconds
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Call', callSchema);

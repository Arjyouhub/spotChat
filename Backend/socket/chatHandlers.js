const User = require('../models/User');
const Message = require('../models/Message');

module.exports = (io, socket, userSocketMap) => {
  // Join Chat Room
  socket.on('join_chat', (room) => {
    socket.join(room);
    console.log(`User ${socket.userId} joined room: ${room}`);
  });

  // Leave Chat Room
  socket.on('leave_chat', (room) => {
    socket.leave(room);
    console.log(`User ${socket.userId} left room: ${room}`);
  });

  // Typing Indicators
  socket.on('typing', ({ room, userName }) => {
    socket.in(room).emit('typing', { room, userName, userId: socket.userId });
  });

  socket.on('stop_typing', ({ room }) => {
    socket.in(room).emit('stop_typing', { room, userId: socket.userId });
  });

  // New Message Broadcast
  socket.on('new_message', (newMessageReceived) => {
    const chat = newMessageReceived.chat;
    if (!chat || !chat.users) return console.log('chat.users not defined');

    chat.users.forEach((user) => {
      const recipientId = user._id || user;
      if (recipientId.toString() === socket.userId.toString()) return;

      // Send via personal room or socket ID if online
      io.to(recipientId.toString()).emit('message_received', newMessageReceived);
    });
  });

  // Read / Delivered Ticks
  socket.on('mark_read', async ({ chatId, messageIds }) => {
    try {
      if (messageIds && messageIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { readBy: socket.userId, deliveredTo: socket.userId } }
        );
      }
      io.to(chatId).emit('messages_read_update', {
        chatId,
        readByUserId: socket.userId,
        messageIds,
      });
    } catch (err) {
      console.error('Error marking read:', err);
    }
  });

  // View Once Opened Event
  socket.on('view_once_opened', async ({ messageId, chatId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, {
        isViewed: true,
        $addToSet: { viewedBy: socket.userId },
      });
      io.to(chatId).emit('view_once_updated', { messageId, viewedBy: socket.userId });
    } catch (err) {
      console.error('Error updating view once:', err);
    }
  });

  // Message Deletion Sync
  socket.on('delete_message_everyone', ({ chatId, messageId }) => {
    io.to(chatId).emit('message_deleted_everyone', { chatId, messageId });
  });

  // Telegram Style: Complete Chat Deletion Sync for both users
  socket.on('delete_chat', ({ chatId, recipientIds }) => {
    if (recipientIds && Array.isArray(recipientIds)) {
      recipientIds.forEach((uid) => {
        io.to(uid.toString()).emit('chat_deleted', { chatId });
      });
    }
    io.to(chatId).emit('chat_deleted', { chatId });
  });

  socket.on('clear_chat', ({ chatId }) => {
    io.to(chatId).emit('chat_cleared', { chatId });
  });

  // Profile Update Sync
  socket.on('update_profile', (profileData) => {
    io.emit('user_profile_updated', {
      userId: socket.userId,
      ...profileData,
    });
  });
};

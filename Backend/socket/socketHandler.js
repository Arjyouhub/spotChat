const jwt = require('jsonwebtoken');
const User = require('../models/User');
const registerChatHandlers = require('./chatHandlers');
const registerCallHandlers = require('./callHandlers');

const userSocketMap = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Socket Middleware for Authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'spotchat_super_secret_jwt_key_2026'
      );
      socket.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    // Store in mapping and join user's private room
    userSocketMap.set(userId.toString(), socket.id);
    socket.join(userId.toString());

    // Update user status in DB and broadcast to contacts
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
      io.emit('user_status_changed', {
        userId,
        isOnline: true,
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error('Error updating user connection status:', err);
    }

    // Register Chat & Call events
    registerChatHandlers(io, socket, userSocketMap);
    registerCallHandlers(io, socket, userSocketMap);

    // Disconnect event
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);
      userSocketMap.delete(userId.toString());

      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
        });
        io.emit('user_status_changed', {
          userId,
          isOnline: false,
          lastSeen,
        });
      } catch (err) {
        console.error('Error updating disconnect status:', err);
      }
    });
  });
};

module.exports = initSocket;

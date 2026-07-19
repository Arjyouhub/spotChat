module.exports = (io, socket, userSocketMap) => {
  // Initiate Video/Audio Call
  socket.on('call_user', ({ userToCall, signalData, from, name, avatar, callType }) => {
    const targetSocketId = userSocketMap.get(userToCall.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming_call', {
        signal: signalData,
        from,
        name,
        avatar,
        callType,
      });
    } else {
      socket.emit('call_failed', { reason: 'User is offline' });
    }
  });

  // Answer Incoming Call
  socket.on('answer_call', ({ to, signal }) => {
    const targetSocketId = userSocketMap.get(to.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_accepted', { signal });
    }
  });

  // Exchange ICE Candidates
  socket.on('ice_candidate', ({ to, candidate }) => {
    const targetSocketId = userSocketMap.get(to.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', { candidate });
    }
  });

  // Reject Call
  socket.on('reject_call', ({ to }) => {
    const targetSocketId = userSocketMap.get(to.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_rejected');
    }
  });

  // End Active Call
  socket.on('end_call', ({ to }) => {
    const targetSocketId = userSocketMap.get(to.toString());
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended');
    }
  });
};

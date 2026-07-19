module.exports = (io, socket, userSocketMap) => {
  const getUserIdString = (u) => {
    if (!u) return '';
    if (typeof u === 'string') return u;
    return (u._id || u.id || u).toString();
  };

  // Initiate Video/Audio Call
  socket.on('call_user', ({ userToCall, signalData, from, name, avatar, callType }) => {
    const targetUserId = getUserIdString(userToCall);
    console.log('[Socket Call] call_user to targetUserId:', targetUserId, 'from:', name);

    if (targetUserId) {
      // Emit to the user's private room so all active devices receive the call
      io.to(targetUserId).emit('incoming_call', {
        signal: signalData,
        from: getUserIdString(from),
        name,
        avatar,
        callType,
      });
    } else {
      socket.emit('call_failed', { reason: 'Target user ID invalid' });
    }
  });

  // Answer Incoming Call
  socket.on('answer_call', ({ to, signal }) => {
    const targetUserId = getUserIdString(to);
    if (targetUserId) {
      io.to(targetUserId).emit('call_accepted', { signal });
    }
  });

  // Exchange ICE Candidates
  socket.on('ice_candidate', ({ to, candidate }) => {
    const targetUserId = getUserIdString(to);
    if (targetUserId) {
      io.to(targetUserId).emit('ice_candidate', { candidate });
    }
  });

  // Reject Call
  socket.on('reject_call', ({ to }) => {
    const targetUserId = getUserIdString(to);
    if (targetUserId) {
      io.to(targetUserId).emit('call_rejected');
    }
  });

  // End Active Call
  socket.on('end_call', ({ to }) => {
    const targetUserId = getUserIdString(to);
    if (targetUserId) {
      io.to(targetUserId).emit('call_ended');
    }
  });
};

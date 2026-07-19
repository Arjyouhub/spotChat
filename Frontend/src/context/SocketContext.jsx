import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());

  useEffect(() => {
    if (!user || !user.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const defaultSocketUrl =
      typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? 'https://spotchat-suiv.onrender.com'
        : 'http://localhost:5000';

    const socketUrl = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;
    const newSocket = io(socketUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
    });

    newSocket.on('user_status_changed', ({ userId, isOnline, lastSeen }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(userId.toString(), { isOnline, lastSeen });
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

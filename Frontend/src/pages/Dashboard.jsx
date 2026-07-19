import React, { useState, useEffect } from 'react';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import GroupModal from '../components/chat/GroupModal';
import ProfileModal from '../components/chat/ProfileModal';
import SearchModal from '../components/chat/SearchModal';
import DeviceManagerModal from '../components/chat/DeviceManagerModal';
import AdminDashboardModal from '../components/admin/AdminDashboardModal';
import IncomingCallModal from '../components/call/IncomingCallModal';
import VideoCallModal from '../components/call/VideoCallModal';

import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Fetch all chats for logged-in user
  const fetchChats = async () => {
    try {
      const { data } = await API.get('/chats');
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      setChats([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  // Listen for real-time chat & profile updates
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessage) => {
      const chatId = newMessage.chat._id || newMessage.chat;
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((c) => c._id === chatId);
        if (chatIndex > -1) {
          const updatedChat = {
            ...prevChats[chatIndex],
            latestMessage: newMessage,
            updatedAt: new Date().toISOString(),
          };
          const rest = prevChats.filter((c) => c._id !== chatId);
          return [updatedChat, ...rest];
        }
        fetchChats();
        return prevChats;
      });
    };

    const handleProfileUpdated = (updatedUser) => {
      const { userId, name, username, avatar, status } = updatedUser;
      if (!userId) return;

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (!chat || !Array.isArray(chat.users)) return chat;
          const updatedUsers = chat.users.map((u) => {
            const uid = typeof u === 'string' ? u : (u?._id || u || '').toString();
            if (uid === userId.toString() && typeof u === 'object') {
              return {
                ...u,
                ...(name && { name }),
                ...(username && { username }),
                ...(avatar && { avatar }),
                ...(status !== undefined && { status }),
              };
            }
            return u;
          });
          return { ...chat, users: updatedUsers };
        })
      );

      setSelectedChat((prevSelected) => {
        if (!prevSelected || !Array.isArray(prevSelected.users)) return prevSelected;
        const updatedUsers = prevSelected.users.map((u) => {
          const uid = typeof u === 'string' ? u : (u?._id || u || '').toString();
          if (uid === userId.toString() && typeof u === 'object') {
            return {
              ...u,
              ...(name && { name }),
              ...(username && { username }),
              ...(avatar && { avatar }),
              ...(status !== undefined && { status }),
            };
          }
          return u;
        });
        return { ...prevSelected, users: updatedUsers };
      });
    };

    const handleChatDeleted = ({ chatId }) => {
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setSelectedChat((current) => (current?._id === chatId ? null : current));
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_profile_updated', handleProfileUpdated);
    socket.on('chat_deleted', handleChatDeleted);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_profile_updated', handleProfileUpdated);
      socket.off('chat_deleted', handleChatDeleted);
    };
  }, [socket]);

  const handleUpdateDisappearing = async (seconds) => {
    if (!selectedChat) return;
    try {
      const { data } = await API.put('/chats/disappearing', {
        chatId: selectedChat._id,
        duration: seconds,
      });

      setSelectedChat(data);
      setChats((prev) =>
        prev.map((c) => (c._id === data._id ? { ...c, disappearingDuration: seconds } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const targetChat = chats.find((c) => c._id === chatId);
      const recipientIds = targetChat ? targetChat.users.map((u) => u._id || u) : [];

      await API.delete(`/chats/${chatId}`);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setSelectedChat(null);

      if (socket) {
        socket.emit('delete_chat', { chatId, recipientIds });
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-hidden font-sans relative transition-colors duration-200">
      {/* Sidebar Chat List */}
      <div
        className={`${
          selectedChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-auto h-full flex-shrink-0`}
      >
        <ChatList
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
          onOpenSearchModal={() => setIsSearchModalOpen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      </div>

      {/* Main Chat Window */}
      <div
        className={`${
          !selectedChat ? 'hidden md:flex' : 'flex'
        } flex-1 h-full`}
      >
        <ChatWindow
          selectedChat={selectedChat}
          currentUser={user}
          onBack={() => setSelectedChat(null)}
          onUpdateDisappearing={handleUpdateDisappearing}
          onDeleteChat={() => handleDeleteChat(selectedChat._id)}
        />
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(newGroup) => {
          setChats([newGroup, ...chats]);
          setSelectedChat(newGroup);
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onChatCreated={(newChat) => {
          if (!chats.some((c) => c._id === newChat._id)) {
            setChats([newChat, ...chats]);
          }
          setSelectedChat(newChat);
        }}
      />

      <DeviceManagerModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* WebRTC Video / Audio Call UI Overlays */}
      <IncomingCallModal />
      <VideoCallModal />
    </div>
  );
};

export default Dashboard;

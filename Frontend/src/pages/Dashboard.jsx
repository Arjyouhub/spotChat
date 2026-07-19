import React, { useState, useEffect } from 'react';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import GroupModal from '../components/chat/GroupModal';
import ProfileModal from '../components/chat/ProfileModal';
import SearchModal from '../components/chat/SearchModal';
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

  // Fetch all chats for logged-in user
  const fetchChats = async () => {
    try {
      const { data } = await API.get('/chats');
      setChats(data);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
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
      fetchChats();
    };

    const handleProfileUpdated = (updatedUser) => {
      const { userId, name, username, avatar, status } = updatedUser;

      setChats((prevChats) =>
        prevChats.map((chat) => {
          const updatedUsers = chat.users.map((u) => {
            if (u._id.toString() === userId.toString()) {
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
        if (!prevSelected) return null;
        const updatedUsers = prevSelected.users.map((u) => {
          if (u._id.toString() === userId.toString()) {
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

    socket.on('message_received', handleMessageReceived);
    socket.on('user_profile_updated', handleProfileUpdated);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('user_profile_updated', handleProfileUpdated);
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

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
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

      {/* WebRTC Video / Audio Call UI Overlays */}
      <IncomingCallModal />
      <VideoCallModal />
    </div>
  );
};

export default Dashboard;

import React, { useState } from 'react';
import { Search, Plus, UserPlus, LogOut, Settings, MessageSquare, AtSign, Sun, Moon, Laptop, Shield } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

const ChatList = ({
  chats,
  selectedChat,
  onSelectChat,
  onOpenGroupModal,
  onOpenSearchModal,
  onOpenProfileModal,
  onOpenDeviceModal,
  onOpenAdminModal,
}) => {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const getOtherUser = (chat) => {
    if (!chat || chat.isGroup || !chat.users) return null;
    const myId = (user?._id || '').toString();
    const found = chat.users.find((u) => {
      const uid = typeof u === 'string' ? u : (u?._id || u || '').toString();
      return uid !== myId;
    });
    if (!found) return null;
    return typeof found === 'string' ? { _id: found, name: 'User' } : found;
  };

  const filteredChats = chats.filter((chat) => {
    const isGroup = chat.isGroup;
    if (activeTab === 'direct' && isGroup) return false;
    if (activeTab === 'groups' && !isGroup) return false;

    const otherUser = getOtherUser(chat);

    const title = isGroup ? chat.chatName : otherUser?.name || '';
    const username = otherUser?.username || '';
    const term = searchQuery.toLowerCase().replace('@', '');

    return (
      title.toLowerCase().includes(term) ||
      username.toLowerCase().includes(term)
    );
  });

  const getChatTitle = (chat) => {
    if (chat.isGroup) return chat.chatName;
    const otherUser = getOtherUser(chat);
    return otherUser?.name || 'User';
  };

  const getChatUsername = (chat) => {
    if (chat.isGroup) return null;
    const otherUser = getOtherUser(chat);
    return otherUser?.username || (otherUser?.email ? otherUser.email.split('@')[0] : null);
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroup) return chat.groupAvatar;
    const otherUser = getOtherUser(chat);
    return otherUser?.avatar;
  };

  const getIsOnline = (chat) => {
    if (chat.isGroup) return undefined;
    const otherUser = getOtherUser(chat);
    if (!otherUser?._id) return false;
    return onlineUsers.get(otherUser._id.toString())?.isOnline ?? otherUser.isOnline ?? false;
  };

  const getLastMessageText = (chat) => {
    if (!chat.latestMessage) return 'No messages yet';
    const msg = chat.latestMessage;
    if (msg.deletedForEveryone) return 'This message was deleted';
    if (msg.isViewOnce) return '🔒 View Once Media';
    if (msg.mediaType === 'image') return '📷 Photo';
    if (msg.mediaType === 'video') return '🎥 Video';
    if (msg.mediaType === 'audio') return '🎵 Audio message';
    if (msg.mediaType === 'file') return '📄 Attachment';
    return msg.content || 'Attachment';
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const myUsername = user?.username || user?.email?.split('@')[0];

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none transition-colors duration-200">
      {/* User Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-md">
        <div
          onClick={onOpenProfileModal}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
          title="Open Profile Settings"
        >
          <Avatar src={user?.avatar} name={user?.name} isOnline={true} size="md" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {user?.name}
            </h3>
            <p className="text-[11px] text-cyan-400 font-semibold truncate">
              @{myUsername}
            </p>
          </div>
        </div>

        {/* Action Header Icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-amber-400 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenDeviceModal}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors"
            title="Linked Devices & E2EE Keys"
          >
            <Laptop className="w-4 h-4" />
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={onOpenAdminModal}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 transition-colors"
              title="Admin Dashboard"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onOpenProfileModal}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors"
            title="Profile Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSearchModal}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            title="Find User by Username"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenGroupModal}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            title="Create New Group"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-rose-500/20 rounded-xl text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 pb-2 flex gap-1 text-xs border-b border-slate-800/60">
        {['all', 'direct', 'groups'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg capitalize font-semibold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Chat List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChats.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No conversations found</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChat?._id === chat._id;
            const title = getChatTitle(chat);
            const username = getChatUsername(chat);
            const avatar = getChatAvatar(chat);
            const isOnline = getIsOnline(chat);

            return (
              <div
                key={chat._id}
                onClick={() => onSelectChat(chat)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600/20 to-cyan-500/10 border border-blue-500/30'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Avatar src={avatar} name={title} isOnline={isOnline} size="md" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-slate-100 truncate">
                      {title}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      {formatTimestamp(chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 truncate">
                      {getLastMessageText(chat)}
                    </p>
                    {username && (
                      <span className="text-[9px] text-cyan-400/80 font-medium ml-1">
                        @{username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;

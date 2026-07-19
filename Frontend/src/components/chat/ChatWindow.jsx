import React, { useState, useEffect, useRef } from 'react';
import { Video, Phone, ArrowLeft, MoreVertical, MessageSquare } from 'lucide-react';
import Avatar from '../common/Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import API from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

const ChatWindow = ({
  selectedChat,
  currentUser,
  onBack,
  onUpdateDisappearing,
}) => {
  const { socket, onlineUsers } = useSocket();
  const { callUser } = useCall();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Target User info for 1-on-1 chats
  const otherUser =
    !selectedChat?.isGroup && selectedChat?.users
      ? selectedChat.users.find((u) => {
          const uid = (u._id || u).toString();
          const myId = (currentUser._id || currentUser).toString();
          return uid !== myId;
        })
      : null;

  // Real-time online status check
  const isTargetOnline = otherUser
    ? onlineUsers.get(otherUser._id.toString())?.isOnline ?? otherUser.isOnline
    : false;

  const targetLastSeen = otherUser
    ? onlineUsers.get(otherUser._id.toString())?.lastSeen ?? otherUser.lastSeen
    : null;

  // Fetch Message History
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/messages/${selectedChat._id}`);
        setMessages(data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('join_chat', selectedChat._id);
    }

    return () => {
      if (socket) {
        socket.emit('leave_chat', selectedChat._id);
      }
    };
  }, [selectedChat, socket]);

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessage) => {
      if (selectedChat && newMessage.chat._id === selectedChat._id) {
        setMessages((prev) => [...prev, newMessage]);
        // Emit mark_read
        socket.emit('mark_read', {
          chatId: selectedChat._id,
          messageIds: [newMessage._id],
        });
      }
    };

    const handleTyping = ({ room, userName, userId }) => {
      if (selectedChat && room === selectedChat._id && userId !== currentUser._id) {
        setTypingUsers((prev) => new Set(prev).add(userName || 'Someone'));
      }
    };

    const handleStopTyping = ({ room, userId }) => {
      if (selectedChat && room === selectedChat._id && userId !== currentUser._id) {
        setTypingUsers(new Set());
      }
    };

    const handleMessagesReadUpdate = ({ chatId, readByUserId }) => {
      if (selectedChat && chatId === selectedChat._id) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            readBy: msg.readBy.includes(readByUserId)
              ? msg.readBy
              : [...msg.readBy, readByUserId],
          }))
        );
      }
    };

    const handleViewOnceUpdated = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isViewed: true } : msg
        )
      );
    };

    const handleMessageDeletedEveryone = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, deletedForEveryone: true, content: 'This message was deleted', mediaUrl: '', mediaType: null }
            : msg
        )
      );
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('messages_read_update', handleMessagesReadUpdate);
    socket.on('view_once_updated', handleViewOnceUpdated);
    socket.on('message_deleted_everyone', handleMessageDeletedEveryone);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('messages_read_update', handleMessagesReadUpdate);
      socket.off('view_once_updated', handleViewOnceUpdated);
      socket.off('message_deleted_everyone', handleMessageDeletedEveryone);
    };
  }, [socket, selectedChat, currentUser]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Send Message Handler
  const handleSendMessage = async (messagePayload) => {
    try {
      const { data } = await API.post('/messages', {
        chatId: selectedChat._id,
        ...messagePayload,
      });

      setMessages((prev) => [...prev, data]);

      if (socket) {
        socket.emit('new_message', data);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Delete message handlers
  const handleDeleteForMe = async (messageId) => {
    try {
      await API.put(`/messages/delete-me/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      await API.put(`/messages/delete-everyone/${messageId}`);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, deletedForEveryone: true, content: 'This message was deleted', mediaUrl: '', mediaType: null }
            : msg
        )
      );
      if (socket) {
        socket.emit('delete_message_everyone', {
          chatId: selectedChat._id,
          messageId,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8">
        <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400 shadow-xl">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-200">No Chat Selected</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          Choose a conversation from the sidebar or start a new chat to begin messaging.
        </p>
      </div>
    );
  }

  const title = selectedChat.isGroup
    ? selectedChat.chatName
    : otherUser
    ? otherUser.name
    : 'Chat';

  const avatarSrc = selectedChat.isGroup
    ? selectedChat.groupAvatar
    : otherUser?.avatar;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 px-2 py-2 sm:px-4 sm:py-3 bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-xl flex items-center justify-between z-20 gap-1.5 sm:gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="md:hidden p-1 sm:p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 flex-shrink-0"
            title="Back to chats"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <Avatar
            src={avatarSrc}
            name={title}
            isOnline={!selectedChat.isGroup ? isTargetOnline : undefined}
            size="sm"
            className="flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate leading-tight">{title}</h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate leading-tight">
              {selectedChat.isGroup ? (
                `${selectedChat.users.length} members`
              ) : isTargetOnline ? (
                <span className="text-emerald-400 font-semibold">Online</span>
              ) : targetLastSeen ? (
                `Last seen ${new Date(targetLastSeen).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons (Video Call, Audio Call) */}
        {!selectedChat.isGroup && otherUser && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => callUser(otherUser, 'audio')}
              className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-cyan-400 hover:text-cyan-300 transition-colors border border-slate-700/50"
              title="Start Audio Call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => callUser(otherUser, 'video')}
              className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-blue-400 hover:text-blue-300 transition-colors border border-slate-700/50"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs italic">
            No messages yet. Send a message to start chatting!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              currentUser={currentUser}
              selectedChat={selectedChat}
              onDeleteForMe={handleDeleteForMe}
              onDeleteForEveryone={handleDeleteForEveryone}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-xs italic text-cyan-400 pl-2 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Component */}
      <MessageInput
        selectedChat={selectedChat}
        onSendMessage={handleSendMessage}
        onUpdateDisappearing={onUpdateDisappearing}
      />
    </div>
  );
};

export default ChatWindow;

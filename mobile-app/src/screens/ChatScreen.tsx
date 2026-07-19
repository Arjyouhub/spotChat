import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
} from 'react-native';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCall } from '../context/CallContext';
import { useTheme } from '../context/ThemeContext';

export const ChatScreen = ({ route, navigation }: any) => {
  const { chat, title } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { callUser } = useCall();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    try {
      const { data } = await API.get(`/messages/${chat._id}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chat._id]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_chat', chat._id);

    const handleMessageReceived = (newMessage: any) => {
      const chatId = newMessage.chat?._id || newMessage.chat;
      if (chatId === chat._id) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleMessageDeletedEveryone = ({ chatId, messageId }: any) => {
      if (chatId === chat._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
          )
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_deleted_everyone', handleMessageDeletedEveryone);

    return () => {
      socket.emit('leave_chat', chat._id);
      socket.off('message_received', handleMessageReceived);
      socket.off('message_deleted_everyone', handleMessageDeletedEveryone);
    };
  }, [socket, chat._id]);

  // Optimistic UI Instant Message Sending (<10ms)
  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const textToSend = inputMessage.trim();
    setInputMessage('');

    const optimisticMessage = {
      _id: tempId,
      chat: chat._id,
      sender: user,
      content: textToSend,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data } = await API.post('/messages', {
        chatId: chat._id,
        content: textToSend,
      });

      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...data, status: 'sent' } : msg))
      );

      if (socket) {
        socket.emit('new_message', data);
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...msg, status: 'failed' } : msg))
      );
    }
  };

  const handleDeleteForMe = async (messageId: string) => {
    try {
      await API.put(`/messages/delete-me/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (e) {}
  };

  const handleDeleteForEveryone = async (messageId: string) => {
    try {
      await API.put(`/messages/delete-everyone/${messageId}`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true, content: 'This message was deleted' } : m
        )
      );
      if (socket) {
        socket.emit('delete_message_everyone', { chatId: chat._id, messageId });
      }
    } catch (e) {}
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isSender = (item.sender?._id || item.sender).toString() === (user._id || user).toString();

    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessage(item);
          setShowDeleteModal(true);
        }}
        style={[
          styles.bubbleContainer,
          isSender ? styles.senderContainer : styles.receiverContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isSender ? colors.userBubble : colors.otherBubble,
            },
          ]}
        >
          {item.deletedForEveryone ? (
            <Text style={[styles.deletedText, { color: colors.textMuted }]}>🗑️ This message was deleted</Text>
          ) : (
            <Text style={[styles.messageText, { color: colors.text }]}>{item.content}</Text>
          )}

          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isSender && (
              <Text style={styles.tickText}>
                {item.status === 'sending' ? '🕒' : item.status === 'failed' ? '⚠️' : '✓✓'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.headerTitle}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.callIcons}>
          <TouchableOpacity onPress={() => callUser(chat.users[0], 'audio')} style={styles.iconButton}>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => callUser(chat.users[0], 'video')} style={styles.iconButton}>
            <Text style={styles.callIcon}>📹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input Box */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surfaceSecondary }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Message Options Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDeleteModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Message?</Text>

            {selectedMessage && (user._id || user).toString() === (selectedMessage.sender?._id || selectedMessage.sender).toString() && (
              <TouchableOpacity
                style={[styles.modalOption, { backgroundColor: colors.danger }]}
                onPress={() => {
                  handleDeleteForEveryone(selectedMessage._id);
                  setShowDeleteModal(false);
                }}
              >
                <Text style={styles.modalOptionTextBold}>Delete for Everyone</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalOption, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => {
                handleDeleteForMe(selectedMessage._id);
                setShowDeleteModal(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Delete for Me</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  callIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 6,
  },
  callIcon: {
    fontSize: 20,
  },
  messagesList: {
    padding: 16,
    gap: 8,
  },
  bubbleContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  senderContainer: {
    alignSelf: 'flex-end',
  },
  receiverContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deletedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  tickText: {
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalOptionTextBold: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

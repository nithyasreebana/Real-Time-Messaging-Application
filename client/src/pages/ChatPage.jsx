import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfileModal from '../components/ProfileModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/api';

const ChatPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Keep ref of activeConversation for socket callbacks
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Load conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await api.get('/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load all users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, [fetchConversations, fetchUsers]);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/messages/${conversationId}?limit=50`);
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Select a conversation
  const handleSelectConversation = (conv) => {
    if (activeConversation && socket) {
      socket.emit('leave_conversation', { conversationId: activeConversation._id });
    }

    setActiveConversation(conv);
    loadMessages(conv._id);
    setIsTyping(false);

    if (socket) {
      socket.emit('join_conversation', { conversationId: conv._id });

      const other = conv.participants.find((p) => p._id !== user._id);
      if (other) {
        socket.emit('mark_seen', {
          conversationId: conv._id,
          senderId: other._id
        });
      }
    }

    // Reset unread count locally for this conversation
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, myUnreadCount: 0 } : c))
    );
  };

  // Start or open conversation with a user
  const handleStartConversationWithUser = async (recipientId) => {
    try {
      const res = await api.post('/conversations', { recipientId });
      if (res.data.success) {
        const conv = res.data.conversation;
        // Check if exists in conversations list
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conv._id);
          if (!exists) {
            return [conv, ...prev];
          }
          return prev;
        });
        handleSelectConversation(conv);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming message
    const handleReceiveMessage = (newMsg) => {
      const currentActive = activeConversationRef.current;

      // If message belongs to active chat, append to messages list
      if (currentActive && newMsg.conversationId === currentActive._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        // Mark as seen immediately
        socket.emit('mark_seen', {
          conversationId: currentActive._id,
          senderId: newMsg.sender._id || newMsg.sender
        });
      }

      // Update conversation in sidebar
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === newMsg.conversationId);
        if (index !== -1) {
          const updated = [...prev];
          const conv = { ...updated[index] };
          conv.lastMessage = newMsg;
          if (!currentActive || currentActive._id !== newMsg.conversationId) {
            conv.myUnreadCount = (conv.myUnreadCount || 0) + 1;
          }
          // Move conversation to top
          updated.splice(index, 1);
          return [conv, ...updated];
        } else {
          // If conversation wasn't in list yet, refetch conversations
          fetchConversations();
          return prev;
        }
      });
    };

    // Seen receipt from recipient
    const handleMessagesSeen = ({ conversationId }) => {
      if (activeConversationRef.current?._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m.status !== 'seen' ? { ...m, status: 'seen' } : m))
        );
      }
    };

    // Delivered receipt
    const handleMessagesDelivered = ({ messageIds }) => {
      if (!messageIds) return;
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id) && m.status === 'sent'
            ? { ...m, status: 'delivered' }
            : m
        )
      );
    };

    // Typing indicators
    const handleUserTyping = (data) => {
      if (
        activeConversationRef.current?._id === data.conversationId &&
        data.userId !== user._id
      ) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      if (activeConversationRef.current?._id === data.conversationId) {
        setIsTyping(false);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_seen', handleMessagesSeen);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_seen', handleMessagesSeen);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [socket, user._id, fetchConversations]);

  // Send message
  const handleSendMessage = ({ conversationId, recipientId, text, mediaUrl, mediaType }) => {
    const payload = { conversationId, recipientId, text, mediaUrl, mediaType };

    if (socket && socket.connected) {
      socket.emit('send_message', payload, (res) => {
        if (res && res.success) {
          const sentMsg = res.message;
          setMessages((prev) => {
            if (prev.some((m) => m._id === sentMsg._id)) return prev;
            return [...prev, sentMsg];
          });

          // Update sidebar preview
          setConversations((prev) => {
            const index = prev.findIndex((c) => c._id === conversationId);
            if (index !== -1) {
              const updated = [...prev];
              const conv = { ...updated[index], lastMessage: sentMsg };
              updated.splice(index, 1);
              return [conv, ...updated];
            }
            return prev;
          });
        }
      });
    } else {
      // Fallback to REST API
      api.post('/messages', payload).then((res) => {
        if (res.data.success) {
          const sentMsg = res.data.message;
          setMessages((prev) => [...prev, sentMsg]);
        }
      });
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId, forEveryone) => {
    try {
      const res = await api.delete(`/messages/${messageId}?forEveryone=${forEveryone}`);
      if (res.data.success) {
        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === messageId
                ? { ...m, isDeleted: true, text: 'This message was deleted', mediaUrl: '' }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
      }
    } catch (err) {
      console.error('Delete message error:', err);
      alert(err.response?.data?.message || 'Failed to delete message.');
    }
  };

  return (
    <div className="app-container">
      <Navbar onOpenProfile={() => setIsProfileModalOpen(true)} />

      <main className="chat-layout">
        <Sidebar
          conversations={conversations}
          users={users}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onStartConversationWithUser={handleStartConversationWithUser}
          loadingConversations={loadingConversations}
        />

        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          loadingMessages={loadingMessages}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          isTyping={isTyping}
        />
      </main>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default ChatPage;

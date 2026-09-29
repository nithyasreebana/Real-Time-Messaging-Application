import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/api';

const ChatWindow = ({
  conversation,
  messages,
  loadingMessages,
  onSendMessage,
  onDeleteMessage,
  isTyping
}) => {
  const { user } = useAuth();
  const { socket, isUserOnline } = useSocket();
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Other participant in conversation
  const recipient = conversation?.participants?.find((p) => p._id !== user._id) || conversation?.participants?.[0];
  const isOnline = recipient ? isUserOnline(recipient._id) : false;

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Typing event emissions
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && conversation && recipient) {
      socket.emit('typing_start', {
        conversationId: conversation._id,
        recipientId: recipient._id
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', {
          conversationId: conversation._id,
          recipientId: recipient._id
        });
      }, 1500);
    }
  };

  // Submit message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket && recipient) {
      socket.emit('typing_stop', {
        conversationId: conversation._id,
        recipientId: recipient._id
      });
    }

    let mediaUrl = '';
    let mediaType = 'none';

    if (selectedFile) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadRes.data.success) {
          mediaUrl = uploadRes.data.mediaUrl;
          mediaType = 'image';
        }
      } catch (err) {
        console.error('File upload failed:', err);
        alert('Failed to upload image. Sending text only.');
      } finally {
        setUploading(false);
      }
    }

    onSendMessage({
      conversationId: conversation._id,
      recipientId: recipient._id,
      text: inputText.trim(),
      mediaUrl,
      mediaType
    });

    setInputText('');
    removeSelectedFile();
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render status tick for sent messages
  const renderStatusTick = (msg) => {
    if (msg.sender._id !== user._id && msg.sender !== user._id) return null;

    if (msg.status === 'seen') {
      return (
        <span className="receipt-tick seen" title="Seen">
          ✓✓
        </span>
      );
    }
    if (msg.status === 'delivered') {
      return (
        <span className="receipt-tick delivered" title="Delivered">
          ✓✓
        </span>
      );
    }
    return (
      <span className="receipt-tick sent" title="Sent">
        ✓
      </span>
    );
  };

  if (!conversation) {
    return (
      <section className="chat-window">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a contact from the sidebar or search users to start messaging in real-time.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-window">
      {/* Top Header */}
      <header className="chat-header">
        <div className="chat-header-user">
          <div className="avatar-wrapper">
            <img
              src={recipient?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${recipient?.username}`}
              alt={recipient?.username}
              className="avatar-img"
            />
            <span className={isOnline ? 'online-dot' : 'offline-dot'} />
          </div>
          <div>
            <div className="chat-header-name">{recipient?.username}</div>
            <div className={`chat-header-status ${isOnline ? 'online' : ''}`}>
              {isTyping
                ? 'typing...'
                : isOnline
                ? 'Online'
                : recipient?.lastSeen
                ? `Last seen ${new Date(recipient.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="messages-container">
        {loadingMessages ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
            Loading conversation messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
            No messages yet. Say hello to {recipient?.username}! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (msg.sender?._id || msg.sender) === user._id;

            return (
              <div
                key={msg._id}
                className={`message-row ${isMe ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  {msg.isDeleted ? (
                    <em style={{ color: '#94a3b8' }}>🚫 This message was deleted</em>
                  ) : (
                    <>
                      {msg.mediaUrl && (
                        <img
                          src={msg.mediaUrl}
                          alt="Media attachment"
                          className="message-media"
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                        />
                      )}
                      {msg.text && <div>{msg.text}</div>}
                    </>
                  )}
                </div>

                <div className="message-meta">
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {renderStatusTick(msg)}

                  {/* Delete options */}
                  {!msg.isDeleted && (
                    <button
                      className="message-delete-btn"
                      title={isMe ? 'Delete message' : 'Delete for me'}
                      onClick={() => {
                        if (isMe) {
                          const forEveryone = window.confirm(
                            'Delete for everyone? Click OK for Everyone, or Cancel to delete for yourself only.'
                          );
                          onDeleteMessage(msg._id, forEveryone);
                        } else {
                          onDeleteMessage(msg._id, false);
                        }
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator banner */}
      {isTyping && (
        <div className="typing-indicator-bar">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
          <span>{recipient?.username} is typing...</span>
        </div>
      )}

      {/* Media Preview before sending */}
      {previewUrl && (
        <div className="media-preview-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={previewUrl} alt="Preview" className="media-preview-thumb" />
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              {selectedFile?.name}
            </span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={removeSelectedFile}>
            Remove
          </button>
        </div>
      )}

      {/* Bottom Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSend}>
        <label className="media-upload-label" title="Attach Image">
          📷
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          disabled={uploading}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={(!inputText.trim() && !selectedFile) || uploading}
        >
          {uploading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  );
};

export default ChatWindow;

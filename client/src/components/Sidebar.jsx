import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Sidebar = ({
  conversations,
  users,
  activeConversation,
  onSelectConversation,
  onStartConversationWithUser,
  loadingConversations
}) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'users'
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to extract the other participant in a 1:1 conversation
  const getOtherParticipant = (conv) => {
    return conv.participants.find((p) => p._id !== user._id) || conv.participants[0];
  };

  // Format message timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherParticipant(conv);
    return (
      other?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter users
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar">
      {/* Search Bar */}
      <div className="sidebar-search-box">
        <input
          type="text"
          className="form-input"
          placeholder={activeTab === 'chats' ? 'Search chats...' : 'Search users...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Chats ({conversations.length})
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          All Users ({users.length})
        </button>
      </div>

      {/* List Content */}
      <div className="conversation-list">
        {activeTab === 'chats' ? (
          loadingConversations ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              {searchQuery ? 'No chats found matching query.' : 'No active chats yet. Click "All Users" to start one!'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isOnline = other ? isUserOnline(other._id) : false;
              const isSelected = activeConversation?._id === conv._id;

              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv)}
                >
                  <div className="avatar-wrapper">
                    <img
                      src={other?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${other?.username}`}
                      alt={other?.username}
                      className="avatar-img"
                    />
                    <span className={isOnline ? 'online-dot' : 'offline-dot'} />
                  </div>

                  <div className="conversation-info">
                    <div className="conv-top-row">
                      <span className="conv-name">{other?.username}</span>
                      <span className="conv-time">
                        {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                      </span>
                    </div>

                    <div className="conv-bottom-row">
                      <span className="conv-preview">
                        {conv.lastMessage?.mediaUrl
                          ? '📷 Photo'
                          : conv.lastMessage?.text || 'No messages yet'}
                      </span>
                      {conv.myUnreadCount > 0 && (
                        <span className="conv-badge">{conv.myUnreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          // Users tab
          filteredUsers.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
              No other users found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isOnline = isUserOnline(u._id);

              return (
                <div
                  key={u._id}
                  className="conversation-item"
                  onClick={() => onStartConversationWithUser(u._id)}
                >
                  <div className="avatar-wrapper">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                      alt={u.username}
                      className="avatar-img"
                    />
                    <span className={isOnline ? 'online-dot' : 'offline-dot'} />
                  </div>

                  <div className="conversation-info">
                    <div className="conv-top-row">
                      <span className="conv-name">{u.username}</span>
                      <span style={{ fontSize: '0.75rem', color: isOnline ? '#22c55e' : '#94a3b8' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="conv-preview">{u.bio || 'Available'}</div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

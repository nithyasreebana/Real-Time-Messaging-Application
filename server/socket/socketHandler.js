const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// In-memory mapping of online users: userId -> Set of socket IDs
const onlineUsers = new Map();

const initSocket = (io) => {
  // 1. Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication failed: Token missing.'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production'
      );

      const user = await User.findById(decoded.id).select(
        '_id username email avatar'
      );
      if (!user) {
        return next(new Error('Authentication failed: User does not exist.'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication failed: Invalid or expired token.'));
    }
  });

  // 2. Connection Handler
  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket] User connected: ${socket.user.username} (${socket.id})`);

    // Add socket ID to user's set of active sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update user status in database
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Broadcast user online status to all clients
    io.emit('user_status_change', {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });

    // Send the list of currently online user IDs to the connected client
    const currentOnlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('online_users_list', currentOnlineUserIds);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Join a specific conversation room
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // Leave a specific conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          conversationId,
          userId,
          username: socket.user.username
        });
      }
    });

    socket.on('typing_stop', ({ conversationId, recipientId }) => {
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_stop_typing', {
          conversationId,
          userId
        });
      }
    });

    // Handle real-time message sending over Socket.IO
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, recipientId, text, mediaUrl, mediaType } = data;

        if (!conversationId || (!text && !mediaUrl)) {
          if (callback) callback({ success: false, message: 'Invalid message data.' });
          return;
        }

        const isRecipientOnline = onlineUsers.has(recipientId?.toString());
        const initialStatus = isRecipientOnline ? 'delivered' : 'sent';
        const deliveredAt = isRecipientOnline ? new Date() : null;

        // Create message in database
        const message = await Message.create({
          conversationId,
          sender: userId,
          recipient: recipientId,
          text: text ? text.trim() : '',
          mediaUrl: mediaUrl || '',
          mediaType: mediaType || (mediaUrl ? 'image' : 'none'),
          status: initialStatus,
          deliveredAt
        });

        // Update conversation lastMessage and unread count
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          let found = false;
          if (conversation.unreadCounts) {
            for (const entry of conversation.unreadCounts) {
              if (entry.user.toString() === recipientId.toString()) {
                entry.count += 1;
                found = true;
                break;
              }
            }
          } else {
            conversation.unreadCounts = [];
          }

          if (!found) {
            conversation.unreadCounts.push({ user: recipientId, count: 1 });
          }

          conversation.lastMessage = message._id;
          await conversation.save();
        }

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar')
          .populate('recipient', 'username avatar');

        // Emit to recipient if online
        io.to(`user:${recipientId}`).emit('receive_message', populatedMessage);

        // Also emit to conversation room if active
        socket.to(`conversation:${conversationId}`).emit('receive_message', populatedMessage);

        // Acknowledge to sender with populated message
        if (callback) {
          callback({ success: true, message: populatedMessage });
        } else {
          socket.emit('message_sent_confirm', populatedMessage);
        }
      } catch (error) {
        console.error('[Socket] Error sending message:', error.message);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    // Mark messages as delivered
    socket.on('mark_delivered', async ({ messageIds, senderId }) => {
      try {
        if (!messageIds || !messageIds.length) return;

        await Message.updateMany(
          {
            _id: { $in: messageIds },
            recipient: userId,
            status: 'sent'
          },
          {
            $set: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        );

        if (senderId) {
          io.to(`user:${senderId}`).emit('messages_delivered', {
            messageIds,
            deliveredAt: new Date()
          });
        }
      } catch (error) {
        console.error('[Socket] Error marking delivered:', error.message);
      }
    });

    // Mark messages as read (seen)
    socket.on('mark_seen', async ({ conversationId, senderId }) => {
      try {
        if (!conversationId) return;

        const updateResult = await Message.updateMany(
          {
            conversationId,
            recipient: userId,
            status: { $ne: 'seen' }
          },
          {
            $set: {
              status: 'seen',
              seenAt: new Date()
            }
          }
        );

        // Reset unread count for current user in conversation
        await Conversation.updateOne(
          { _id: conversationId, 'unreadCounts.user': userId },
          { $set: { 'unreadCounts.$.count': 0 } }
        );

        // Notify the sender that their messages were seen
        if (senderId) {
          io.to(`user:${senderId}`).emit('messages_seen', {
            conversationId,
            seenBy: userId,
            seenAt: new Date()
          });
        }

        io.to(`conversation:${conversationId}`).emit('conversation_read', {
          conversationId,
          readBy: userId
        });
      } catch (error) {
        console.error('[Socket] Error marking seen:', error.message);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.user.username} (${socket.id})`);
      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);

        // If user has no more open tabs/connections
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();

          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen
          });

          // Notify everyone user went offline
          io.emit('user_status_change', {
            userId,
            isOnline: false,
            lastSeen
          });
        }
      }
    });
  });
};

module.exports = { initSocket, onlineUsers };

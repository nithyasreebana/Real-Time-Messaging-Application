const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Send a message (text or media)
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, text, mediaUrl, mediaType } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required.'
      });
    }

    if (!text && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain either text or media.'
      });
    }

    // Verify conversation and ensure current user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    // Find the other participant (recipient)
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    // Create the message
    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      recipient: recipientId,
      text: text ? text.trim() : '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || (mediaUrl ? 'image' : 'none'),
      status: 'sent'
    });

    // Update conversation lastMessage & increment recipient's unreadCount
    let recipientUnreadFound = false;
    if (conversation.unreadCounts) {
      for (const entry of conversation.unreadCounts) {
        if (entry.user.toString() === recipientId.toString()) {
          entry.count += 1;
          recipientUnreadFound = true;
          break;
        }
      }
    } else {
      conversation.unreadCounts = [];
    }

    if (!recipientUnreadFound) {
      conversation.unreadCounts.push({ user: recipientId, count: 1 });
    }

    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar');

    return res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get message history for a conversation with pagination
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    // Verify access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    const query = {
      conversationId,
      deletedFor: { $ne: req.user._id }
    };

    const totalMessages = await Message.countDocuments(query);

    // Fetch messages: newest first for pagination, then reversed for chronological view
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar');

    return res.status(200).json({
      success: true,
      total: totalMessages,
      page,
      pages: Math.ceil(totalMessages / limit),
      hasMore: skip + messages.length < totalMessages,
      messages: messages.reverse() // Send chronological order to client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload media file for messages
// @route   POST /api/messages/upload
// @access  Private
const uploadMedia = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file type is not supported.'
      });
    }

    // Build URL path accessible to client
    const mediaUrl = `/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      mediaUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all unread messages in a conversation as read (seen)
// @route   PUT /api/messages/read/:conversationId
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    // Mark messages where recipient is current user as 'seen'
    const updateResult = await Message.updateMany(
      {
        conversationId,
        recipient: req.user._id,
        status: { $ne: 'seen' }
      },
      {
        $set: {
          status: 'seen',
          seenAt: new Date()
        }
      }
    );

    // Reset current user's unread count in the conversation
    if (conversation.unreadCounts) {
      for (const entry of conversation.unreadCounts) {
        if (entry.user.toString() === req.user._id.toString()) {
          entry.count = 0;
          break;
        }
      }
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read.',
      updatedCount: updateResult.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update single message status (e.g. delivered / seen)
// @route   PUT /api/messages/:id/status
// @access  Private
const updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['delivered', 'seen'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either delivered or seen.'
      });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.'
      });
    }

    // Only recipient can mark message as delivered or seen
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can update the message status.'
      });
    }

    message.status = status;
    if (status === 'delivered' && !message.deliveredAt) {
      message.deliveredAt = new Date();
    }
    if (status === 'seen') {
      message.seenAt = new Date();
      if (!message.deliveredAt) message.deliveredAt = new Date();
    }

    await message.save();

    return res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (delete for me or delete for everyone)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { forEveryone } = req.query;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.'
      });
    }

    // Verify user is either sender or recipient
    const isSender = message.sender.toString() === req.user._id.toString();
    const isRecipient = message.recipient.toString() === req.user._id.toString();

    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message.'
      });
    }

    if (forEveryone === 'true') {
      // Only sender can delete for everyone
      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: 'Only the sender can delete a message for everyone.'
        });
      }

      message.isDeleted = true;
      message.text = 'This message was deleted';
      message.mediaUrl = '';
      message.mediaType = 'none';
      await message.save();

      return res.status(200).json({
        success: true,
        message: 'Message deleted for everyone.',
        deletedMessage: message
      });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted for you.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get total unread message count for current user
// @route   GET /api/messages/unread/total
// @access  Private
const getTotalUnreadCount = async (req, res, next) => {
  try {
    const totalUnread = await Message.countDocuments({
      recipient: req.user._id,
      status: { $ne: 'seen' },
      deletedFor: { $ne: req.user._id }
    });

    return res.status(200).json({
      success: true,
      totalUnread
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  uploadMedia,
  markAsRead,
  updateMessageStatus,
  deleteMessage,
  getTotalUnreadCount
};

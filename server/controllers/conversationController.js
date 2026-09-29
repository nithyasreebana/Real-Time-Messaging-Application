const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Create or fetch an existing 1:1 conversation
// @route   POST /api/conversations
// @access  Private
const createOrGetConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required.'
      });
    }

    if (recipientId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a conversation with yourself.'
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.'
      });
    }

    // Check if conversation already exists between these 2 users
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 }
    })
      .populate('participants', 'username email avatar bio isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        unreadCounts: [
          { user: req.user._id, count: 0 },
          { user: recipientId, count: 0 }
        ]
      });

      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'username email avatar bio isOnline lastSeen'
      );
    }

    return res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for the logged in user
// @route   GET /api/conversations
// @access  Private
const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username email avatar bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender recipient',
          select: 'username avatar'
        }
      })
      .sort({ updatedAt: -1 });

    // Format conversations with user-friendly unread count for current user
    const formatted = conversations.map((conv) => {
      const convObj = conv.toObject();
      const myUnreadEntry = convObj.unreadCounts?.find(
        (u) => u.user.toString() === req.user._id.toString()
      );
      convObj.myUnreadCount = myUnreadEntry ? myUnreadEntry.count : 0;
      return convObj;
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      conversations: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    })
      .populate('participants', 'username email avatar bio isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    const convObj = conversation.toObject();
    const myUnreadEntry = convObj.unreadCounts?.find(
      (u) => u.user.toString() === req.user._id.toString()
    );
    convObj.myUnreadCount = myUnreadEntry ? myUnreadEntry.count : 0;

    return res.status(200).json({
      success: true,
      conversation: convObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/clear a conversation
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied.'
      });
    }

    // Delete all messages belonging to this conversation
    await Message.deleteMany({ conversationId: conversation._id });

    // Delete the conversation document
    await Conversation.findByIdAndDelete(conversation._id);

    return res.status(200).json({
      success: true,
      message: 'Conversation and its messages deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrGetConversation,
  getMyConversations,
  getConversationById,
  deleteConversation
};

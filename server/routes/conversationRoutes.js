const express = require('express');
const router = express.Router();
const {
  createOrGetConversation,
  getMyConversations,
  getConversationById,
  deleteConversation
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createOrGetConversation);
router.get('/', getMyConversations);
router.get('/:id', getConversationById);
router.delete('/:id', deleteConversation);

module.exports = router;

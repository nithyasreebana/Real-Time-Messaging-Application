const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  uploadMedia,
  markAsRead,
  updateMessageStatus,
  deleteMessage,
  getTotalUnreadCount
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/', sendMessage);
router.post('/upload', upload.single('file'), uploadMedia);
router.get('/unread/total', getTotalUnreadCount);
router.get('/:conversationId', getMessages);
router.put('/read/:conversationId', markAsRead);
router.put('/:id/status', updateMessageStatus);
router.delete('/:id', deleteMessage);

module.exports = router;

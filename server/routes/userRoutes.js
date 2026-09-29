const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateProfile,
  updateStatus,
  checkUsername
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Public route to check username availability
router.get('/check/:username', checkUsername);

// Protected routes
router.use(protect);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/profile', updateProfile);
router.put('/status', updateStatus);

module.exports = router;

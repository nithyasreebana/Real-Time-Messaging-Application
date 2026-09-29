const User = require('../models/User');

// @desc    Get all users or search users (excluding current user)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = {
      _id: { $ne: req.user._id }
    };

    if (search && search.trim()) {
      query.$or = [
        { username: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ isOnline: -1, username: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { username, bio, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (username && username.trim() !== user.username) {
      const existing = await User.findOne({ username: username.trim() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken.'
        });
      }
      user.username = username.trim();
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user online status or last seen
// @route   PUT /api/users/status
// @access  Private
const updateStatus = async (req, res, next) => {
  try {
    const { isOnline } = req.body;
    const updateData = {};

    if (typeof isOnline === 'boolean') {
      updateData.isOnline = isOnline;
      if (!isOnline) {
        updateData.lastSeen = new Date();
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true
    }).select('-__v');

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check username availability
// @route   GET /api/users/check/:username
// @access  Public
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.params;
    const existing = await User.findOne({ username: username.toLowerCase().trim() });

    return res.status(200).json({
      success: true,
      available: !existing
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateProfile,
  updateStatus,
  checkUsername
};

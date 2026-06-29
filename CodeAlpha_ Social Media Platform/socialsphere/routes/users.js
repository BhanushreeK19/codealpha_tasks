const express = require('express');
const router = express.Router();
const { User, Post, Follower, Like, Comment } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const path = require('path');
const bcrypt = require('bcryptjs');

const PAGE_SIZE = 10;

// Search users
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.json({ success: true, users: [] });

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.like]: `%${q}%` } },
          { full_name: { [Op.like]: `%${q}%` } }
        ],
        id: { [Op.ne]: req.session.userId }
      },
      attributes: ['id', 'username', 'full_name', 'profile_picture', 'bio'],
      limit: 10
    });

    const usersWithFollow = await Promise.all(users.map(async u => {
      const isFollowing = await Follower.findOne({ where: { follower_id: req.session.userId, following_id: u.id } });
      return { ...u.toJSON(), isFollowing: !!isFollowing };
    }));

    res.json({ success: true, users: usersWithFollow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load user' });
  }
});

// Get user profile
router.get('/:username', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username },
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * PAGE_SIZE;

    const followerCount = await Follower.count({ where: { following_id: user.id } });
    const followingCount = await Follower.count({ where: { follower_id: user.id } });
    const isFollowing = await Follower.findOne({ where: { follower_id: req.session.userId, following_id: user.id } });
    const isOwnProfile = user.id === req.session.userId;

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { user_id: user.id },
      include: [
        { model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] },
        { model: Like, attributes: ['user_id'] },
        {
          model: Comment,
          include: [{ model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: PAGE_SIZE,
      offset,
      distinct: true
    });

    const postsData = posts.map(p => ({
      ...p.toJSON(),
      likeCount: p.Likes.length,
      liked: p.Likes.some(l => l.user_id === req.session.userId),
      commentCount: p.Comments.length
    }));

    res.json({
      success: true,
      user: { ...user.toJSON(), followerCount, followingCount, isFollowing: !!isFollowing, isOwnProfile },
      posts: postsData,
      pagination: { page, totalPages: Math.ceil(count / PAGE_SIZE), totalPosts: count }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
});

// Update profile
router.put('/me/update', requireAuth, async (req, res) => {
  try {
    const { full_name, bio, website, location } = req.body;
    const user = await User.findByPk(req.session.userId);

    let profile_picture = user.profile_picture;
    if (req.files && req.files.profile_picture) {
      const file = req.files.profile_picture;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Only image files allowed' });
      }
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Image must be under 5MB' });
      }
      const fileName = `avatar_${req.session.userId}_${Date.now()}${path.extname(file.name)}`;
      await file.mv(path.join(__dirname, '../public/uploads/', fileName));
      profile_picture = fileName;
    }

    await user.update({ full_name, bio, website, location, profile_picture });
    res.json({ success: true, message: 'Profile updated!', user: { ...user.toJSON(), password: undefined } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Change password
router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.session.userId);

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    if (new_password.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const hashed = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashed });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// Follow / Unfollow
router.post('/:username/follow', requireAuth, async (req, res) => {
  try {
    const target = await User.findOne({ where: { username: req.params.username } });
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.id === req.session.userId) return res.status(400).json({ success: false, message: "You can't follow yourself" });

    const existing = await Follower.findOne({ where: { follower_id: req.session.userId, following_id: target.id } });
    if (existing) {
      await existing.destroy();
      const followerCount = await Follower.count({ where: { following_id: target.id } });
      return res.json({ success: true, following: false, followerCount });
    }

    await Follower.create({ follower_id: req.session.userId, following_id: target.id });
    const followerCount = await Follower.count({ where: { following_id: target.id } });
    res.json({ success: true, following: true, followerCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to follow/unfollow' });
  }
});

router.get('/:username/followers', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const followers = await Follower.findAll({
      where: { following_id: user.id },
      include: [{
        model: User,
        as: 'Follower',
        attributes: ['id', 'username', 'full_name', 'profile_picture']
      }]
    });

    res.json({
      success: true,
      followers: followers.map(f => f.Follower)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to load followers'
    });
  }
});

router.get('/:username/following', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { username: req.params.username }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const following = await Follower.findAll({
      where: { follower_id: user.id },
      include: [{
        model: User,
        as: 'Following',
        attributes: ['id', 'username', 'full_name', 'profile_picture']
      }]
    });

    res.json({
      success: true,
      following: following.map(f => f.Following)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to load following'
    });
  }
});

module.exports = router;

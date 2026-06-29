const express = require('express');
const router = express.Router();
const { Post, User, Comment, Like, Follower } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const path = require('path');

const PAGE_SIZE = 10;

// Get feed posts (from followed users + own posts)
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * PAGE_SIZE;

    const following = await Follower.findAll({ where: { follower_id: req.session.userId } });
    const followingIds = following.map(f => f.following_id);
    followingIds.push(req.session.userId);

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { user_id: { [Op.in]: followingIds } },
      include: [
        { model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] },
        { model: Like, attributes: ['user_id'] },
        {
          model: Comment,
          include: [{ model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] }],
          order: [['created_at', 'ASC']]
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
      posts: postsData,
      pagination: {
        page,
        totalPages: Math.ceil(count / PAGE_SIZE),
        totalPosts: count
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
});

// Get all posts (explore)
router.get('/explore', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * PAGE_SIZE;

    const { count, rows: posts } = await Post.findAndCountAll({
      include: [
        { model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] },
        { model: Like, attributes: ['user_id'] },
        { model: Comment, attributes: ['id'] }
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

    res.json({ success: true, posts: postsData, pagination: { page, totalPages: Math.ceil(count / PAGE_SIZE), totalPosts: count } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
});

// Create post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Post content cannot be empty' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Post too long (max 2000 characters)' });
    }

    let image_url = null;
    if (req.files && req.files.image) {
      const file = req.files.image;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ success: false, message: 'Only image files allowed' });
      }
      const fileName = `post_${req.session.userId}_${Date.now()}${path.extname(file.name)}`;
      await file.mv(path.join(__dirname, '../public/uploads/', fileName));
      image_url = fileName;
    }

    const post = await Post.create({ user_id: req.session.userId, content: content.trim(), image_url });
    const fullPost = await Post.findByPk(post.id, {
      include: [{ model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] }]
    });

    res.json({ success: true, post: { ...fullPost.toJSON(), likeCount: 0, liked: false, commentCount: 0, Comments: [] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

// Edit post
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.user_id !== req.session.userId) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content cannot be empty' });

    await post.update({ content: content.trim(), is_edited: true });
    res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  }
});

// Delete post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.user_id !== req.session.userId) return res.status(403).json({ success: false, message: 'Not authorized' });

    await post.destroy();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

// Like / Unlike
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = await Like.findOne({ where: { post_id: req.params.id, user_id: req.session.userId } });
    if (existing) {
      await existing.destroy();
      const count = await Like.count({ where: { post_id: req.params.id } });
      return res.json({ success: true, liked: false, likeCount: count });
    }

    await Like.create({ post_id: req.params.id, user_id: req.session.userId });
    const count = await Like.count({ where: { post_id: req.params.id } });
    res.json({ success: true, liked: true, likeCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update like' });
  }
});

// Comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    if (content.length > 500) return res.status(400).json({ success: false, message: 'Comment too long (max 500 chars)' });

    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = await Comment.create({ post_id: req.params.id, user_id: req.session.userId, content: content.trim() });
    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['id', 'username', 'full_name', 'profile_picture'] }]
    });
    res.json({ success: true, comment: full });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
});

router.delete('/:postId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user_id !== req.session.userId) return res.status(403).json({ success: false, message: 'Not authorized' });

    await comment.destroy();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

module.exports = router;

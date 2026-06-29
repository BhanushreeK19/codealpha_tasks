const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  full_name: { type: DataTypes.STRING(100) },
  bio: { type: DataTypes.TEXT },
  profile_picture: { type: DataTypes.STRING(255), defaultValue: 'default-avatar.png' },
  website: { type: DataTypes.STRING(255) },
  location: { type: DataTypes.STRING(100) },
  is_active: { type: DataTypes.TINYINT, defaultValue: 1 }
}, { tableName: 'users', underscored: true });

const Post = sequelize.define('Post', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  image_url: { type: DataTypes.STRING(255) },
  is_edited: { type: DataTypes.TINYINT, defaultValue: 0 }
}, { tableName: 'posts', underscored: true });

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  post_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'comments', underscored: true });

const Like = sequelize.define('Like', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  post_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'likes', underscored: true, timestamps: false });

const Follower = sequelize.define('Follower', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  follower_id: { type: DataTypes.INTEGER, allowNull: false },
  following_id: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'followers', underscored: true, updatedAt: false });

// Associations
User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

Post.hasMany(Comment, { foreignKey: 'post_id' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

Post.hasMany(Like, { foreignKey: 'post_id' });
Like.belongsTo(Post, { foreignKey: 'post_id' });

User.hasMany(Like, { foreignKey: 'user_id' });
Like.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Follower, { as: 'Following', foreignKey: 'follower_id' });
User.hasMany(Follower, { as: 'Followers', foreignKey: 'following_id' });

Follower.belongsTo(User, {
  foreignKey: 'follower_id',
  as: 'Follower'
});

Follower.belongsTo(User, {
  foreignKey: 'following_id',
  as: 'Following'
});

module.exports = { sequelize, User, Post, Comment, Like, Follower };

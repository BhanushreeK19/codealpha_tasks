const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const { requireAuthPage, redirectIfAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ limits: { fileSize: 10 * 1024 * 1024 }, createParentPath: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'socialsphere_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Page Routes
app.get('/', redirectIfAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', redirectIfAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/register', redirectIfAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/feed', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/explore', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/profile/:username', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/settings', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));
app.get('/search', requireAuthPage, (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));

// Session check endpoint
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ loggedIn: true, userId: req.session.userId, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Start server
sequelize.sync({ alter: false })
  .then(() => {
    console.log('✅ Database connected & synced');
    app.listen(PORT, () => {
      console.log(`🚀 SocialSphere running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('📋 Please ensure MySQL is running and update config/database.js');
    // Still start server for demo purposes
    app.listen(PORT, () => {
      console.log(`🚀 SocialSphere running at http://localhost:${PORT} (without DB)`);
    });
  });

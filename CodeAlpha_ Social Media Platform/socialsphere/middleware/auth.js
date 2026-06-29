const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Please log in to continue' });
  }
  next();
};

const requireAuthPage = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

const redirectIfAuth = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/feed');
  }
  next();
};

module.exports = { requireAuth, requireAuthPage, redirectIfAuth };

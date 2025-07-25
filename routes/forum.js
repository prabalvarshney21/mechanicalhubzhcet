const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();

// In-memory storage
let posts = [];
let nextId = 1;

// Multer storage for forum uploads
const forumStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/forum');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: forumStorage });

// Show forum page
router.get('/', (req, res) => {
  res.render('forum', { posts });
});

// Handle new post
router.post('/post', upload.single('image'), (req, res) => {
  const { username, text } = req.body;
  const imageUrl = req.file ? \`/uploads/forum/\${req.file.filename}\` : null;
  posts.unshift({
    id: nextId++,
    username: username.trim() || 'Anonymous',
    text: text.trim(),
    imageUrl,
    createdAt: new Date(),
    comments: []
  });
  res.redirect('/forum');
});

// Handle new comment
router.post('/comment', upload.single('commentImage'), (req, res) => {
  const { postId, username, text } = req.body;
  const post = posts.find(p => p.id === parseInt(postId));
  if (post) {
    const commentImage = req.file ? \`/uploads/forum/\${req.file.filename}\` : null;
    post.comments.push({
      username: username.trim() || 'Anonymous',
      text: text.trim(),
      commentImage,
      createdAt: new Date()
    });
  }
  res.redirect('/forum');
});

module.exports = router;

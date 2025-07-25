const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// --- Data & Forum Setup ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const forumDataPath = path.join(dataDir, 'forum.json');
if (!fs.existsSync(forumDataPath)) {
  fs.writeFileSync(forumDataPath, JSON.stringify({ posts: [], nextId: 1 }, null, 2));
}

function loadForumData() {
  try {
    return JSON.parse(fs.readFileSync(forumDataPath, 'utf8'));
  } catch {
    return { posts: [], nextId: 1 };
  }
}

function saveForumData(data) {
  fs.writeFileSync(forumDataPath, JSON.stringify(data, null, 2));
}

let { posts: forumPosts, nextId: nextForumId } = loadForumData();

// --- Academic Data ---
const years = ['2nd', '3rd', '4th'];
const semesters = {
  '2nd': ['sem3', 'sem4'],
  '3rd': ['sem5', 'sem6'],
  '4th': ['sem7', 'sem8'],
};
const subjects = {
  sem3: ["Higher Mathematics","Experimental Methods & Analysis","Mechanics of Solids","Kinematics of Machines","Fluid Mechanics-I","Material Science","Machine Drawing","Fluids Mechanics Lab","Manufacturing Technology Lab-I"],
  sem4: ["Numerical Methods & Optimization","Electrical Technology & Control","Electrical Technology Lab","Machine Design I","Applied Thermodynamics","Manufacturing Technology-I","Thermodynamics Lab"],
  sem5: ["Machine Design II","Heat & Mass Transfer","Fluid Mechanics II","Industrial Engineering & Operations Research","Manufacturing Technology-II","Heat & Mass Transfer Lab","Machine Design Practice","Departmental Elective-1"],
  sem6: ["Machinery Dynamics","I.C. Engines","Energy Conversion System","Fluid Machinery","Manufacturing Tech Lab-II","Solid Modelling & Analysis","Kinematics & Stress Analysis Lab","Fluid Mechanics & Machinery Lab","Engineering Economy & Management"],
  sem7: ["Industrial Training/Internship","Project (Phase II)","Departmental Elective-3","Departmental Elective-4","Departmental Elective-5","Open Elective-2","Humanities Elective"],
  sem8: ["Mechanical Vibrations","Manufacturing Technology Lab-III","Vibrations Lab","Energy Conversion Systems Lab","Colloquium","Project (Phase I)","Departmental Elective-2","Open Elective-1","Humanities Elective"],
};

// --- Multer Setup ---
const notesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { year, sem, subject, unit } = req.body;
    let dir = path.join(__dirname, 'uploads', 'notes', year, sem, subject);
    if (unit) dir = path.join(dir, 'Unit' + unit);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const uploadNotes = multer({ storage: notesStorage });

const pyqsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { year, sem, subject } = req.body;
    const dir = path.join(__dirname, 'uploads', 'pyqs', year, sem, subject);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const uploadPyqs = multer({ storage: pyqsStorage });

const forumStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'forum');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const uploadForum = multer({ storage: forumStorage });

// --- Express Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use((req, res, next) => { res.locals.session = req.session; next(); });

// --- Auth Middleware ---
function requireAuth(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/login');
}

// --- Public Routes ---
app.get('/', (req, res) => res.render('home'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username==='admin' && password==='password123') {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid credentials' });
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/admin', requireAuth, (req, res) => res.render('admin'));

// Admin manage forum route
app.get('/admin/forum', requireAuth, (req, res) => {
  if (!req.session.admin) return res.status(403).send('Forbidden');
  const category = req.query.category || null;
  const posts = category ? forumPosts.filter(p => p.category === category) : forumPosts;
  res.render('forum', { posts, category });
});


// --- Contact Routes ---
app.get('/contact', (req, res) =>
  res.render('contact', { error: null, success: null })
);
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // Log submission in your terminal
  console.log('Contact form submission:', { name, email, message });

  // Render with success popup
  res.render('contact', { error: null, success: 'Thank you!' });
});

// --- Upload Routes ---
app.get('/upload', requireAuth, (req, res) => {
  let { type, year, sem, subject, unit, success, error } = req.query;
  if (!type) type = 'notes';
  if (!['notes','pyqs'].includes(type)) return res.status(404).render('404');
  res.render('upload', { type, year, sem, subject, unit, years, semesters, subjects, success, error });
});
app.post('/upload', requireAuth, (req, res) => {
  const { type, year, sem, subject, unit } = req.body;
  const handler = type === 'pyqs'
    ? uploadPyqs.array('files')
    : uploadNotes.array('files');
  handler(req, res, err => {
    if (err) {
      return res.render('upload', {
        type, year, sem, subject, unit, years, semesters, subjects,
        success: null, error: err.message
      });
    }
    const msg = type==='pyqs'
      ? 'PYQs uploaded successfully'
      : 'Notes uploaded successfully';
    const params = new URLSearchParams({ type, year, sem, subject, unit, success: msg });
    res.redirect('/upload?' + params.toString());
  });
});

// --- Attendance Route ---
app.get('/attendance', (req, res) => res.render('attendance'));

// --- Notes Browsing ---
app.get('/notes', (req, res) => res.render('notes',{ years, semesters }));
app.get('/notes/:year', (req, res) => {
  const { year } = req.params;
  if (!years.includes(year)) return res.status(404).render('404');
  res.render('notes', { year, years, semesters });
});
app.get('/notes/:year/:sem', (req, res) => {
  const { year, sem } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem))
    return res.status(404).render('404');
  res.render('notes_sem', { year, sem, subjects, years, semesters });
});
app.get('/notes/:year/:sem/:subject', (req, res) => {
  const { year, sem, subject } = req.params;
  const unit = req.query.unit;
  if (!years.includes(year) || !semesters[year].includes(sem) || !subjects[sem].includes(subject))
    return res.status(404).render('404');
  if (unit) {
    const unitDir = path.join(__dirname, 'uploads', 'notes', year, sem, subject, 'Unit' + unit);
    const files = fs.existsSync(unitDir) ? fs.readdirSync(unitDir) : [];
    return res.render('notes_unit', { year, sem, subject, unit, files, years, semesters });
  }
  res.render('notes_subject', { year, sem, subject, years, semesters });
});

// --- PYQs Browsing ---
app.get('/pyqs', (req, res) => res.render('pyqs', { years, semesters, subjects }));
app.get('/pyqs/:year', (req, res) => {
  const { year } = req.params;
  if (!years.includes(year)) return res.status(404).render('404');
  res.render('pyqs', { year, years, semesters, subjects });
});
app.get('/pyqs/:year/:sem', (req, res) => {
  const { year, sem } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem))
    return res.status(404).render('404');
  res.render('pyqs', { year, sem, years, semesters, subjects });
});
app.get('/pyqs/:year/:sem/:subject', (req, res) => {
  const { year, sem, subject } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem) || !subjects[sem].includes(subject))
    return res.status(404).render('404');
  const dir = path.join(__dirname, 'uploads', 'pyqs', year, sem, subject);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  res.render('pyqs_subject', { year, sem, subject, files, years, semesters, subjects });
});

// --- Forum Routes ---
app.get('/forum', (req, res) => {
  const category = req.query.category || null;
  const posts = category ? forumPosts.filter(p => p.category === category) : [];
  res.render('forum', { posts, category });
});
app.post('/forum/post', uploadForum.array('files'), (req, res) => {
  const { username, text, category } = req.body;
  const cleanUsername = username.trim() || 'Anonymous';
  // Track ownership
  req.session.username = cleanUsername;

  const files = req.files ? req.files.map(f => 'forum/' + f.filename) : [];
  forumPosts.unshift({ _id: nextForumId++, username: cleanUsername, text: text.trim(), category, files, createdAt: new Date(), comments: [] });
  saveForumData({ posts: forumPosts, nextId: nextForumId });
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/comment/:id', uploadForum.array('files'), (req, res) => {
  const { username, comment, category } = req.body;
  const cleanUsername = username.trim() || 'Anonymous';
  // Track ownership
  req.session.username = cleanUsername;

  const files = req.files ? req.files.map(f => 'forum/' + f.filename) : [];
  const post = forumPosts.find(p => p._id === parseInt(req.params.id));
  if (post) {
    post.comments.push({ username: cleanUsername, comment: comment.trim(), files, createdAt: new Date() });
    saveForumData({ posts: forumPosts, nextId: nextForumId });
  }
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/delete/:id', (req, res) => {
  const category = req.query.category || null;
  const postId = parseInt(req.params.id);
  const post = forumPosts.find(p => p._id === postId);
  // Only admin or author
  if (!req.session.admin && req.session.username !== post.username) {
    return res.status(403).send('Forbidden');
  }
  forumPosts = forumPosts.filter(p => p._id !== postId);
  saveForumData({ posts: forumPosts, nextId: nextForumId });
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/delete/:postId/comment/:idx', (req, res) => {
  const category = req.query.category || null;
  const postId = parseInt(req.params.postId);
  const post = forumPosts.find(p => p._id === postId);
  const idx = parseInt(req.params.idx);
  if (post) {
    const comment = post.comments[idx];
    // Only admin or comment author
    if (!req.session.admin && req.session.username !== comment.username) {
      return res.status(403).send('Forbidden');
    }
    post.comments.splice(idx, 1);
    saveForumData({ posts: forumPosts, nextId: nextForumId });
  }
  res.redirect(`/forum?category=${category}`);
});

// --- 404 Handler ---
app.use((req, res) => res.status(404).render('404'));

// --- Start Server ---
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
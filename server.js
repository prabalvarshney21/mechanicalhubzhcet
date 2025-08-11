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

const bannerFile = path.join(dataDir, 'banner.json');
const defaultBannerText = '🚀 New Notes for Sem 5 Released • Join the Forum Now! &nbsp;&nbsp;&nbsp;&nbsp; 📚 PYQs Updated for All Semesters! &nbsp;&nbsp;&nbsp;&nbsp; 💬 Post Your Doubts in the Forum! &nbsp;&nbsp;&nbsp;&nbsp;';
if (!fs.existsSync(bannerFile)) {
    fs.writeFileSync(bannerFile, JSON.stringify({ text: defaultBannerText }, null, 2));
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

function getBannerText() {
  try {
    const data = JSON.parse(fs.readFileSync(bannerFile, 'utf8'));
    return data.text || defaultBannerText;
  } catch {
    return defaultBannerText;
  }
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

const labCourseKeywords = ['lab', 'drawing', 'practice', 'training', 'project', 'colloquium', 'vibrations lab'];
function isLabCourse(subjectName) {
    const lowerCaseSubject = subjectName.toLowerCase();
    return labCourseKeywords.some(keyword => lowerCaseSubject.includes(keyword));
}


// --- Multer Setup ---
const notesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { year, sem, subject, unit } = req.body;
    const subjectIsLab = isLabCourse(subject);
    const base = path.join(__dirname, 'uploads', 'notes', year, sem, subject);
    const dir = unit && !subjectIsLab ? path.join(base, 'Unit' + unit) : base;
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

const syllabusStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { year, sem } = req.body;
    const dir = path.join(__dirname, 'uploads', 'syllabus', year, sem);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const subject = req.body.subject;
    const extension = path.extname(file.originalname);
    cb(null, subject + extension);
  },
});
const uploadSyllabus = multer({ storage: syllabusStorage });


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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));

app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.bannerText = getBannerText();
    next();
});

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
  if (username === 'admin' && password === 'password123') {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid credentials' });
});
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/contact', (req, res) => res.render('contact', { error: null, success: null }));
app.post('/contact', (req, res) => {
  console.log('Contact form submission:', req.body);
  res.render('contact', { error: null, success: 'Thank you!' });
});

// **--- CORRECTED Search Route ---**
app.get('/search', (req, res) => {
    const query = (req.query.q || '').trim();
    const results = {
        notes: [],
        pyqs: [],
        forum: []
    };

    if (query) {
        const lowerCaseQuery = query.toLowerCase();

        // Search Notes and PYQs files
        const uploadsDir = path.join(__dirname, 'uploads');
        ['notes', 'pyqs'].forEach(type => {
            const typeDir = path.join(uploadsDir, type);
            if (!fs.existsSync(typeDir)) return;

            fs.readdirSync(typeDir, { withFileTypes: true }).forEach(yearDirent => {
                if (!yearDirent.isDirectory()) return;
                const year = yearDirent.name;
                const yearDir = path.join(typeDir, year);

                fs.readdirSync(yearDir, { withFileTypes: true }).forEach(semDirent => {
                    if (!semDirent.isDirectory()) return;
                    const sem = semDirent.name;
                    const semDir = path.join(yearDir, sem);

                    fs.readdirSync(semDir, { withFileTypes: true }).forEach(subjectDirent => {
                        if (!subjectDirent.isDirectory()) return;
                        const subject = subjectDirent.name;
                        const subjectDir = path.join(semDir, subject);
                        
                        function searchInDir(currentDir) {
                            if (!fs.existsSync(currentDir)) return;
                            fs.readdirSync(currentDir, { withFileTypes: true }).forEach(dirent => {
                                const fullPath = path.join(currentDir, dirent.name);
                                if (dirent.isDirectory()) {
                                    searchInDir(fullPath);
                                } else {
                                    // **FIX**: Search in filename, subject, sem, and year
                                    const searchableText = `${dirent.name} ${subject} ${sem} ${year} year`.toLowerCase();
                                    if (searchableText.includes(lowerCaseQuery)) {
                                        results[type].push({
                                            year, sem, subject,
                                            name: dirent.name,
                                            path: fullPath.replace(path.join(__dirname, 'uploads'), '').replace(/\\/g, '/')
                                        });
                                    }
                                }
                            });
                        }
                        searchInDir(subjectDir);
                    });
                });
            });
        });

        // Search Forum
        results.forum = forumPosts.filter(post => 
            post.text.toLowerCase().includes(lowerCaseQuery) ||
            post.username.toLowerCase().includes(lowerCaseQuery)
        );
    }

    res.render('search-results', { query, results });
});


// --- Admin Dashboard ---
app.get('/admin', requireAuth, (req, res) => {
  res.render('admin');
});

app.post('/admin/banner', requireAuth, (req, res) => {
    const { bannerText } = req.body;
    try {
        fs.writeFileSync(bannerFile, JSON.stringify({ text: bannerText }, null, 2));
    } catch (error) {
        console.error("Failed to update banner:", error);
    }
    res.redirect('/admin');
});

app.get('/admin/forum', requireAuth, (req, res) => {
  const category = req.query.category || null;
  const posts = category ? forumPosts.filter(p => p.category === category) : forumPosts;
  res.render('forum', { posts, category });
});

// --- Upload Routes ---
app.get('/upload', requireAuth, (req, res) => {
  let { type = 'notes', year, sem, subject, unit, success, error } = req.query;
  if (!['notes', 'pyqs', 'syllabus'].includes(type)) type = 'notes';
  
  let filesList = [];
  if (year && sem && subject) {
    const decodedSubject = decodeURIComponent(subject);
    let dir;
    if (type === 'syllabus') {
        dir = path.join(__dirname, 'uploads', 'syllabus', year, sem);
        if (fs.existsSync(dir)) {
            const allSyllabi = fs.readdirSync(dir);
            const targetFile = allSyllabi.find(f => f.startsWith(decodedSubject));
            if(targetFile) filesList.push(targetFile);
        }
    } else {
        const base = path.join(__dirname, 'uploads', type, year, sem, decodedSubject);
        const subjectIsLab = isLabCourse(decodedSubject);
        dir = (type === 'notes' && unit && !subjectIsLab) ? path.join(base, 'Unit' + unit) : base;
        if (fs.existsSync(dir)) filesList = fs.readdirSync(dir);
    }
  }
  
  const allSubjects = [...new Set(Object.values(subjects).flat())];
  const labCourseNames = allSubjects.filter(isLabCourse);

  res.render('upload', {
    type, year, sem,
    subject: subject ? decodeURIComponent(subject) : '',
    unit, years, semesters, subjects,
    success, error, filesList, labCourseNames
  });
});

app.post('/upload', requireAuth, (req, res) => {
  const { type = 'notes' } = req.query;
  const { year, sem, subject, unit } = req.body;

  let handler;
  if (type === 'pyqs') {
    handler = uploadPyqs.array('files');
  } else if (type === 'syllabus') {
    handler = uploadSyllabus.single('file'); 
  } else {
    handler = uploadNotes.array('files');
  }

  handler(req, res, err => {
    if (err) {
      return res.render('upload', {
        type, year, sem, subject, unit,
        years, semesters, subjects,
        success: null, error: err.message, filesList: [],
        labCourseNames: []
      });
    }
    const msg = `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`;
    const params = new URLSearchParams({ type, year, sem, subject, unit, success: msg });
    res.redirect('/upload?' + params.toString());
  });
});

app.post('/upload/delete', requireAuth, (req, res) => {
  const { type = 'notes' } = req.query;
  const { year, sem, subject: encodedSubject, unit } = req.query;
  const { file } = req.body;
  const subject = decodeURIComponent(encodedSubject);

  if (!year || !sem || !subject || !file) {
    return res.status(400).send('Missing required parameters for deletion.');
  }

  let filePath;
  if (type === 'syllabus') {
    filePath = path.join(__dirname, 'uploads', 'syllabus', year, sem, file);
  } else {
    let dir = path.join(__dirname, 'uploads', type, year, sem, subject);
    const subjectIsLab = isLabCourse(subject);
    if (type === 'notes' && unit && !subjectIsLab) {
      dir = path.join(dir, 'Unit' + unit);
    }
    filePath = path.join(dir, file);
  }
  
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  }
  
  const params = new URLSearchParams({ type, year, sem, subject: encodedSubject, unit, success: 'Item deleted successfully' });
  res.redirect('/upload?' + params.toString());
});


// --- Notes Browse ---
app.get('/notes', (req, res) => res.render('notes',{ years, semesters }));
app.get('/notes/:year', (req, res) => {
  const { year } = req.params;
  if (!years.includes(year)) return res.status(404).render('404');
  res.render('notes', { year, years, semesters });
});
app.get('/notes/:year/:sem', (req, res) => {
  const { year, sem } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem)) return res.status(404).render('404');
  res.render('notes_sem', { year, sem, subjects, years, semesters });
});
app.get('/notes/:year/:sem/:subject', (req, res) => {
  const unit = req.query.unit;
  const { year, sem, subject } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem) || !subjects[sem].includes(subject)) {
    return res.status(404).render('404');
  }
  
  const subjectIsLab = isLabCourse(subject);

  if (unit && !subjectIsLab) {
    const dir = path.join(__dirname, 'uploads', 'notes', year, sem, subject, 'Unit'+unit);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    return res.render('notes_unit', { year, sem, subject, unit, files, years, semesters });
  }

  let files = [];
  if (subjectIsLab) {
      const dir = path.join(__dirname, 'uploads', 'notes', year, sem, subject);
      if (fs.existsSync(dir)) {
          files = fs.readdirSync(dir);
      }
  }

  res.render('notes_subject', {
      year, sem, subject, years, semesters,
      isLabCourse: subjectIsLab,
      files: files
  });
});

// --- PYQs Browse ---
app.get('/pyqs', (req, res) => res.render('pyqs',{ years, semesters, subjects }));

app.get('/pyqs/:year', (req, res) => {
  const { year } = req.params;
  if (!years.includes(year)) return res.status(404).render('404');
  res.render('pyqs',{ year, years, semesters, subjects });
});

app.get('/pyqs/:year/:sem', (req, res) => {
    const { year, sem } = req.params;
    const { exam } = req.query; 

    if (!years.includes(year) || !semesters[year].includes(sem)) {
        return res.status(404).render('404');
    }

    if (exam) {
        const examType = exam === 'midsem' ? 'Mid-Semester' : 'End-Semester';
        const papersBySubject = [];
        const subjectsForSem = subjects[sem] || [];

        subjectsForSem.forEach(subject => {
            const subjectDir = path.join(__dirname, 'uploads', 'pyqs', year, sem, subject);
            if (fs.existsSync(subjectDir)) {
                const allFiles = fs.readdirSync(subjectDir);
                const matchingFiles = allFiles.filter(file => {
                    const lowerFile = file.toLowerCase();
                    if (exam === 'midsem') {
                        return lowerFile.includes('midsem') || lowerFile.includes('mid-sem');
                    }
                    if (exam === 'endsem') {
                        return lowerFile.includes('endsem') || lowerFile.includes('end-sem');
                    }
                    return false;
                });

                if (matchingFiles.length > 0) {
                    papersBySubject.push({
                        subjectName: subject,
                        files: matchingFiles
                    });
                }
            }
        });

        return res.render('pyqs_subject', {
            year,
            sem,
            examType,
            papersBySubject,
        });
    }

    res.render('pyqs', { year, sem, years, semesters, subjects });
});

app.get('/pyqs/:year/:sem/:subject', (req, res) => {
  const { year, sem, subject } = req.params;
  if (!years.includes(year) || !semesters[year].includes(sem) || !subjects[sem].includes(subject)) {
    return res.status(404).render('404');
  }
  const dir = path.join(__dirname, 'uploads', 'pyqs', year, sem, subject);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  res.render('pyqs_subject', {
    year, sem, subject, files,
    examType: `${subject} Papers`,
    papersBySubject: [{ subjectName: subject, files: files }]
  });
});

// --- Forum Routes ---
app.get('/forum', (req, res) => {
  const category = req.query.category || null;
  const posts = category ? forumPosts.filter(p => p.category === category) : forumPosts;
  res.render('forum', { posts, category });
});
app.post('/forum/post', uploadForum.array('files'), (req, res) => {
  const { username, text, category } = req.body;
  const cleanUsername = username.trim() || 'Anonymous';
  req.session.username = cleanUsername;
  const filesArr = req.files ? req.files.map(f => 'forum/' + f.filename) : [];
  forumPosts.unshift({ _id: nextForumId++, username: cleanUsername, text: text.trim(), category, files: filesArr, createdAt: new Date(), comments: [] });
  saveForumData({ posts: forumPosts, nextId: nextForumId });
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/comment/:id', uploadForum.array('files'), (req, res) => {
  const { username, comment, category } = req.body;
  const cleanUsername = username.trim() || 'Anonymous';
  req.session.username = cleanUsername;
  const filesArr = req.files ? req.files.map(f => 'forum/' + f.filename) : [];
  const post = forumPosts.find(p => p._id === parseInt(req.params.id));
  if (post) { post.comments.push({ username: cleanUsername, comment: comment.trim(), files: filesArr, createdAt: new Date() }); saveForumData({ posts: forumPosts, nextId: nextForumId }); }
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/delete/:id', (req, res) => {
  const category = req.query.category || null;
  const postId = parseInt(req.params.id);
  const post = forumPosts.find(p => p._id === postId);
  if (!req.session.admin && req.session.username !== post.username) return res.status(403).send('Forbidden');
  forumPosts = forumPosts.filter(p => p._id !== postId);
  saveForumData({ posts: forumPosts, nextId: nextForumId });
  res.redirect(`/forum?category=${category}`);
});
app.post('/forum/delete/:postId/comment/:idx', (req, res) => {
  const category = req.query.category || null;
  const post = forumPosts.find(p => p._id === parseInt(req.params.postId));
  if (post) {
    const idx = parseInt(req.params.idx);
    const comment = post.comments[idx];
    if (!req.session.admin && req.session.username !== comment.username) return res.status(403).send('Forbidden');
    post.comments.splice(idx, 1);
    saveForumData({ posts: forumPosts, nextId: nextForumId });
  }
  res.redirect(`/forum?category=${category}`);
});

// --- Logging Request ---
app.use((req, res, next) => {
  console.log("Requested URL:", req.url);
  next();
});

// --- Test Route ---
app.get('/test', (req, res) => res.send("Test working"));

// --- 404 Handler ---
app.use((req, res) => res.status(404).render('404'));

// --- Start Server ---
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
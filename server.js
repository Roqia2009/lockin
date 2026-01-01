const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// In-memory database
let users = [
  { id: 1, email: 'student@test.com', password: '123456', name: 'Ahmed Ali', points: 420, sessions: 24, streak: 7 },
  { id: 2, email: 'parent@test.com', password: '123456', name: 'Mr. Mustafa', studentId: 1 }
];

let sessions = [];

// 🆕 Routes جديدة

// Signup Route (الجديد)
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }

  const newUser = {
    id: users.length + 1,
    email,
    password,
    name,
    points: 0,
    sessions: 0,
    streak: 0
  };

  users.push(newUser);
  res.json({ success: true, user: newUser });
});

// Login Route (موجود أصلي)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Start Session Route (موجود أصلي - شغال 100%)
app.post('/api/start-session', (req, res) => {
  const { userId, subject, duration } = req.body;
  const session = {
    id: Date.now(),
    userId,
    subject,
    duration,
    timeLeft: duration * 60,
    status: 'running',
    startTime: new Date(),
    distractions: 0
  };
  sessions.push(session);
  
  const user = users.find(u => u.id === userId);
  if (user) {
    user.points += 25;
    user.sessions += 1;
  }
  
  res.json({ success: true, session });
});

// User info (موجود أصلي)
app.get('/api/user/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  res.json(user || {});
});

// Parent dashboard (موجود أصلي)
app.get('/api/parent/:studentId', (req, res) => {
  const student = users.find(u => u.id === parseInt(req.params.studentId));
  res.json(student || {});
});

app.listen(PORT, () => {
  console.log(`🚀 LockIn Backend running on http://localhost:${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});

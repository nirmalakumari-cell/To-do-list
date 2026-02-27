// ============================================
// server.js — Express App (Supabase Edition)
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes    = require('./routes/auth');
const taskRoutes    = require('./routes/tasks');
const subjectRoutes = require('./routes/subjects');
const examRoutes    = require('./routes/exams');
const userRoutes    = require('./routes/users');
const { sendDeadlineReminders } = require('./utils/emailService');

// Initialize Supabase connection check
require('./utils/supabase');

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:3000",
  "https://cyber-academy101.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.options("*", cors());

// ── API Routes ──────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/tasks',    taskRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams',    examRoutes);
app.use('/api/users',    userRoutes);

// ── Health Check ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'StudyBoard API running (Supabase edition)' });
});

// ── 404 Handler ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ── Cron: send reminders every day at 8 AM ──
cron.schedule('0 8 * * *', () => {
  console.log('📧 Running deadline reminder cron...');
  sendDeadlineReminders();
});

// ── Start Server ────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
});

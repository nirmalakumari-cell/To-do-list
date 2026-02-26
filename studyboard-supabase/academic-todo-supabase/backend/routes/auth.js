// ============================================
// routes/auth.js — Supabase Auth Routes
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me  (protected)
// ============================================
// Supabase handles password hashing & JWTs automatically.
// We just proxy the calls and also manage a `profiles` table
// to store extra user info (name, daily_study_goal, etc.)
// ============================================

const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ─────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // Auto-confirm email (for dev)
      user_metadata: { name }        // Store name in auth metadata
    });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Also insert into our `profiles` table for extra data
    await supabaseAdmin.from('profiles').insert({
      id:                data.user.id,
      name,
      email,
      daily_study_goal:  4,
      today_studied_min: 0
    });

    // Sign in to get the session token
    const { data: session, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;

    res.status(201).json({
      success: true,
      token: session.session.access_token,
      user: {
        id:    data.user.id,
        name,
        email: data.user.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Supabase handles password verification
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Fetch profile for extra fields
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      token: data.session.access_token,
      user: {
        id:              data.user.id,
        name:            profile?.name || data.user.user_metadata?.name || email,
        email:           data.user.email,
        dailyStudyGoal:  profile?.daily_study_goal || 4
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/me (Protected) ────────────
router.get('/me', protect, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  res.json({
    success: true,
    user: {
      id:              req.user.id,
      email:           req.user.email,
      name:            profile?.name || req.user.user_metadata?.name,
      dailyStudyGoal:  profile?.daily_study_goal || 4,
      todayStudiedMin: profile?.today_studied_min || 0,
      lastStudyDate:   profile?.last_study_date
    }
  });
});

module.exports = router;

// ============================================
// routes/users.js — Profile & Study Tracking
// GET  /api/users/profile
// PUT  /api/users/profile
// POST /api/users/study-log
// ============================================

const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── GET /api/users/profile ───────────────────
router.get('/profile', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/users/profile ───────────────────
router.put('/profile', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name             !== undefined) updates.name              = req.body.name;
    if (req.body.dailyStudyGoal   !== undefined) updates.daily_study_goal  = req.body.dailyStudyGoal;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── POST /api/users/study-log ────────────────
// Called when a Pomodoro session finishes
router.post('/study-log', async (req, res) => {
  try {
    const minutes = parseInt(req.body.minutes) || 25;

    // Fetch current profile
    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (fetchErr) throw fetchErr;

    // Check if last_study_date is today — reset counter if it's a new day
    const today = new Date().toDateString();
    const lastDate = profile.last_study_date
      ? new Date(profile.last_study_date).toDateString()
      : null;

    const currentMinutes = lastDate === today ? (profile.today_studied_min || 0) : 0;
    const newMinutes = currentMinutes + minutes;
    const goalMinutes = (profile.daily_study_goal || 4) * 60;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        today_studied_min: newMinutes,
        last_study_date:   new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        todayStudiedMinutes: newMinutes,
        goalMinutes,
        percentage: Math.min(100, Math.round((newMinutes / goalMinutes) * 100))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

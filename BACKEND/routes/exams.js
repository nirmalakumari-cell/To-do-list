// ============================================
// routes/exams.js — Exam Countdown CRUD
// GET    /api/exams
// POST   /api/exams
// PUT    /api/exams/:id
// DELETE /api/exams/:id
// ============================================

const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── Helper: add daysRemaining virtual ───────
function withCountdown(exam) {
  const now = new Date();
  const diff = new Date(exam.exam_date) - now;
  return { ...exam, daysRemaining: Math.ceil(diff / (1000 * 60 * 60 * 24)) };
}

// ── GET /api/exams ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('user_id', req.user.id)
      .order('exam_date', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data.map(withCountdown) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/exams ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, subject, examDate, location, notes } = req.body;

    if (!title || !subject || !examDate) {
      return res.status(400).json({ success: false, message: 'Title, subject and examDate are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('exams')
      .insert({
        user_id:   req.user.id,
        title,
        subject,
        exam_date: examDate,
        location:  location || null,
        notes:     notes    || null
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: withCountdown(data) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT /api/exams/:id ───────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { title, subject, examDate, location, notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from('exams')
      .update({ title, subject, exam_date: examDate, location, notes })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: withCountdown(data) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/exams/:id ────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('exams')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

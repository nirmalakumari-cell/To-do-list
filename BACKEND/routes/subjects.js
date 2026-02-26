// ============================================
// routes/subjects.js — Subject CRUD
// ============================================
const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .select('*')
      .eq('user_id', req.user.id)
      .order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({ ...req.body, user_id: req.user.id })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select().single();
    if (error || !data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

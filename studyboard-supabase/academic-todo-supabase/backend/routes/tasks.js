// ============================================
// routes/tasks.js — Task CRUD via Supabase
// GET    /api/tasks              — list tasks (filterable)
// POST   /api/tasks              — create task
// GET    /api/tasks/dashboard    — dashboard stats
// GET    /api/tasks/:id          — single task
// PUT    /api/tasks/:id          — update task
// DELETE /api/tasks/:id          — delete task
// PATCH  /api/tasks/:id/complete — toggle complete
// ============================================

const express = require('express');
const { supabaseAdmin } = require('../utils/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);  // All task routes require auth

// ── Helper: calculate progress from subtasks ──
function calcProgress(subtasks = [], status = 'To Do') {
  if (status === 'Completed') return 100;
  if (!subtasks || subtasks.length === 0) return status === 'In Progress' ? 50 : 0;
  const done = subtasks.filter(s => s.completed).length;
  return Math.round((done / subtasks.length) * 100);
}

// ── GET /api/tasks/dashboard ─────────────────
// IMPORTANT: This route must come before /:id
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Fetch all tasks for this user
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // Calculate stats in JS (simpler than multiple DB calls)
    const total     = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const overdue   = tasks.filter(t =>
      t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date()
    ).length;

    // Group by priority
    const byPriority = ['Low', 'Medium', 'High', 'Urgent'].map(p => ({
      _id: p,
      count: tasks.filter(t => t.priority === p).length
    })).filter(p => p.count > 0);

    // Group by subject
    const subjectMap = {};
    tasks.forEach(t => {
      subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1;
    });
    const bySubject = Object.entries(subjectMap).map(([k, v]) => ({ _id: k, count: v }));

    // 5 most recent tasks
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(t => ({ ...t, progress: calcProgress(t.subtasks, t.status) }));

    res.json({
      success: true,
      data: {
        stats: { total, completed, inProgress, overdue, todo: total - completed - inProgress },
        byPriority,
        bySubject,
        recentTasks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/tasks ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, priority, subject, tag, search } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .order('due_date', { ascending: true, nullsFirst: false });

    // Apply filters
    if (status)   query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (subject)  query = query.eq('subject', subject);
    if (tag)      query = query.eq('tag', tag);
    if (search)   query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Add virtual progress field
    const tasks = data.map(t => ({ ...t, progress: calcProgress(t.subtasks, t.status) }));

    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/tasks ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, description, subject, tag, dueDate, priority, status, subtasks } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        user_id:     req.user.id,
        title,
        description: description || null,
        subject:     subject  || 'Other',
        tag:         tag      || 'Assignment',
        due_date:    dueDate  || null,
        priority:    priority || 'Medium',
        status:      status   || 'To Do',
        subtasks:    subtasks || [],       // Stored as JSONB
        reminder_sent: false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: { ...data, progress: calcProgress(data.subtasks, data.status) }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── GET /api/tasks/:id ───────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)   // Ensure task belongs to this user
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: { ...data, progress: calcProgress(data.subtasks, data.status) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/tasks/:id ───────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { title, description, subject, tag, dueDate, priority, status, subtasks } = req.body;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({
        title,
        description: description || null,
        subject,
        tag,
        due_date:   dueDate || null,
        priority,
        status,
        subtasks:   subtasks || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: { ...data, progress: calcProgress(data.subtasks, data.status) } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/tasks/:id ────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/tasks/:id/complete ───────────
router.patch('/:id/complete', async (req, res) => {
  try {
    // Fetch current task first
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Toggle status
    const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';

    // If completing, mark all subtasks done
    const updatedSubtasks = newStatus === 'Completed'
      ? (task.subtasks || []).map(s => ({ ...s, completed: true }))
      : task.subtasks;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ status: newStatus, subtasks: updatedSubtasks, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { ...data, progress: calcProgress(data.subtasks, data.status) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

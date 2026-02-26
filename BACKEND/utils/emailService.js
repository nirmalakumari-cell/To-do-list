// ============================================
// utils/emailService.js — Nodemailer Reminders
// Runs as a daily cron job at 8 AM
// ============================================
const nodemailer = require('nodemailer');
const { supabaseAdmin } = require('./supabase');

const createTransporter = () => nodemailer.createTransporter({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendDeadlineReminders = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('📧 Email not configured — skipping reminders');
    return;
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const endOfTomorrow   = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    // Find tasks due tomorrow that haven't been reminded
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*, profiles!tasks_user_id_fkey(name, email)')
      .neq('status', 'Completed')
      .eq('reminder_sent', false)
      .gte('due_date', startOfTomorrow)
      .lte('due_date', endOfTomorrow);

    if (error) throw error;
    if (!tasks || tasks.length === 0) return;

    // Group by user
    const byUser = {};
    tasks.forEach(task => {
      const uid = task.user_id;
      if (!byUser[uid]) byUser[uid] = { profile: task.profiles, tasks: [] };
      byUser[uid].tasks.push(task);
    });

    const transporter = createTransporter();

    for (const uid in byUser) {
      const { profile, tasks: userTasks } = byUser[uid];
      if (!profile?.email) continue;

      await transporter.sendMail({
        from:    `"StudyBoard" <${process.env.EMAIL_USER}>`,
        to:      profile.email,
        subject: '⏰ Tasks Due Tomorrow — StudyBoard Reminder',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0f14;color:#e2e8f0;padding:32px;border-radius:12px">
            <h2 style="color:#7c6af7">⏰ Tasks Due Tomorrow</h2>
            <p>Hi <strong>${profile.name || 'Student'}</strong>, you have ${userTasks.length} task(s) due tomorrow:</p>
            <ul style="padding-left:20px">
              ${userTasks.map(t => `
                <li style="margin:10px 0">
                  <strong>${t.title}</strong> 
                  <span style="color:#94a3b8">(${t.subject})</span><br/>
                  <small>Due: ${new Date(t.due_date).toLocaleString()}</small>
                  <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:8px">${t.priority}</span>
                </li>`).join('')}
            </ul>
            <p style="color:#94a3b8;font-size:13px">Stay focused! — StudyBoard 📚</p>
          </div>`
      });

      // Mark reminders as sent
      await supabaseAdmin
        .from('tasks')
        .update({ reminder_sent: true })
        .in('id', userTasks.map(t => t.id));

      console.log(`📧 Reminder sent to ${profile.email}`);
    }
  } catch (err) {
    console.error('❌ Reminder error:', err.message);
  }
};

module.exports = { sendDeadlineReminders };

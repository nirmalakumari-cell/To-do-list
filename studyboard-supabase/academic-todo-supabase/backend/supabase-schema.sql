-- ============================================================
-- StudyBoard — Supabase Database Schema
-- Run this entire file in:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. PROFILES TABLE ────────────────────────────────────────
-- Extends Supabase Auth users with extra profile data.
-- The `id` column references auth.users automatically.
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  daily_study_goal  INT  DEFAULT 4,        -- hours per day
  today_studied_min INT  DEFAULT 0,        -- minutes studied today
  last_study_date   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. TASKS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  subject       TEXT DEFAULT 'Other' CHECK (subject IN (
                  'Mathematics','Physics','Computer Science',
                  'Chemistry','Biology','History','English','Economics','Other'
                )),
  tag           TEXT DEFAULT 'Assignment' CHECK (tag IN (
                  'Assignment','Exam','Project','Revision','Other'
                )),
  due_date      TIMESTAMPTZ,
  priority      TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  status        TEXT DEFAULT 'To Do'  CHECK (status  IN ('To Do','In Progress','Completed')),
  subtasks      JSONB DEFAULT '[]',         -- Array of {title, completed} objects
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. SUBJECTS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  professor  TEXT,
  credits    INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. EXAMS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  exam_date  TIMESTAMPTZ NOT NULL,
  location   TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This ensures users can only access their own data.
-- The backend uses the SERVICE_ROLE key which bypasses RLS,
-- but it's good practice to enable it anyway.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams    ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Tasks: users can only see/edit their own tasks
CREATE POLICY "tasks_own" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Subjects: users can only see/edit their own subjects
CREATE POLICY "subjects_own" ON subjects
  FOR ALL USING (auth.uid() = user_id);

-- Exams: users can only see/edit their own exams
CREATE POLICY "exams_own" ON exams
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES (for faster queries)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_exams_user_id    ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- ============================================================
-- Done! Your database is ready.
-- ============================================================

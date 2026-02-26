# 📚 StudyBoard — Academic To-Do (Supabase Edition)

Full-stack app using **Node.js + Express** backend and **Supabase (PostgreSQL)** as the database, with **Supabase Auth** replacing manual bcrypt/JWT.

---

## 📁 Folder Structure

```
academic-todo-supabase/
├── backend/
│   ├── middleware/
│   │   └── auth.js             # Verifies Supabase JWT tokens
│   ├── routes/
│   │   ├── auth.js             # Register/Login via Supabase Auth
│   │   ├── tasks.js            # Full task CRUD + dashboard stats
│   │   ├── subjects.js         # Subject CRUD
│   │   ├── exams.js            # Exam CRUD with countdown
│   │   └── users.js            # Profile + Pomodoro study log
│   ├── utils/
│   │   ├── supabase.js         # Supabase client setup (anon + admin)
│   │   └── emailService.js     # Nodemailer deadline reminders
│   ├── server.js               # Express app entry point
│   ├── supabase-schema.sql     # ← Run this in Supabase SQL Editor
│   ├── package.json
│   └── .env.example            # → Copy to .env
│
└── frontend/
    └── index.html              # Complete single-page app
```

---

## 🔑 Key Difference From MongoDB Version

| Feature | MongoDB Version | Supabase Version |
|---------|----------------|-----------------|
| Database | MongoDB/Mongoose | PostgreSQL/Supabase |
| Auth | bcrypt + custom JWT | Supabase Auth (built-in) |
| Password hashing | Manual (bcrypt) | Handled by Supabase |
| JWT | Generated with jsonwebtoken | Issued by Supabase |
| ORM/ODM | Mongoose models | Supabase JS client |
| Connection | MONGO_URI | SUPABASE_URL + keys |

---

## 🚀 Setup Instructions

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in project name, database password, region
4. Wait ~2 minutes for it to provision

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `backend/supabase-schema.sql`
4. Paste it into the editor and click **"Run"**
5. You should see: `Success. No rows returned`

This creates 4 tables: `profiles`, `tasks`, `subjects`, `exams`

### Step 3 — Get Your API Keys

In Supabase Dashboard → **Project Settings** → **API**:

- Copy **Project URL** → `SUPABASE_URL`
- Copy **anon public** key → `SUPABASE_ANON_KEY`  
- Copy **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ Keep the `service_role` key secret — never expose it in frontend code.

### Step 4 — Configure Environment

```bash
cd backend
cp .env.example .env
# Open .env and fill in your Supabase keys
```

Your `.env` should look like:
```env
PORT=5000
SUPABASE_URL=https://abcdefghij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FRONTEND_URL=http://localhost:3000
# Optional email config
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

### Step 5 — Install & Start Backend

```bash
cd backend
npm install
npm run dev    # development (auto-reload)
# or
npm start      # production
```

You should see:
```
🚀 Server running on http://localhost:5000
📡 Supabase URL: https://your-project.supabase.co
```

### Step 6 — Open Frontend

```bash
# Serve the frontend (simple approach):
cd frontend
npx serve .
# Then open http://localhost:3000
```

Or just double-click `frontend/index.html` to open it directly in your browser.

---

## 🔌 API Routes

### Auth (No JWT Required)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user via Supabase Auth |
| POST | `/api/auth/login` | Login, returns Supabase JWT |
| GET | `/api/auth/me` | Get current user (🔒 Protected) |

### Tasks (🔒 All Protected)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | List tasks (filter by status/priority/subject/tag/search) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/dashboard` | Stats + charts data |
| GET | `/api/tasks/:id` | Single task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/complete` | Toggle complete |

### Exams, Subjects, Users (🔒 All Protected)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST/PUT/DELETE | `/api/exams` | Exam countdown CRUD |
| GET/POST/PUT/DELETE | `/api/subjects` | Subject CRUD |
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update name/daily goal |
| POST | `/api/users/study-log` | Log Pomodoro session |

---

## 🗄️ Supabase Tables

### `profiles`
```sql
id UUID, name TEXT, email TEXT, 
daily_study_goal INT, today_studied_min INT, last_study_date TIMESTAMPTZ
```

### `tasks`
```sql
id UUID, user_id UUID, title TEXT, description TEXT,
subject TEXT, tag TEXT, due_date TIMESTAMPTZ,
priority TEXT, status TEXT, subtasks JSONB,
reminder_sent BOOLEAN, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

### `exams`
```sql
id UUID, user_id UUID, title TEXT, subject TEXT,
exam_date TIMESTAMPTZ, location TEXT, notes TEXT
```

### `subjects`
```sql
id UUID, user_id UUID, name TEXT, color TEXT, professor TEXT, credits INT
```

---

## 📧 Email Reminders (Optional)

For Gmail:
1. Enable 2-Factor Auth on your Google account
2. Go to: Google Account → Security → 2-Step Verification → **App Passwords**
3. Create an app password for "Mail"
4. Use that 16-character password as `EMAIL_PASS` in `.env`

Reminders fire automatically at **8 AM daily** (via node-cron).

---

## 🧪 Quick API Test

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@test.com","password":"password123"}'

# Login (copy the token from response)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@test.com","password":"password123"}'

# Create task (replace YOUR_TOKEN)
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Study for finals","subject":"Mathematics","priority":"High"}'
```

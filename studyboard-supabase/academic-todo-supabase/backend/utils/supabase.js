// ============================================
// utils/supabase.js — Supabase Client Setup
// ============================================
// We create TWO clients:
//   1. supabase      → uses ANON key  (respects Row Level Security)
//   2. supabaseAdmin → uses SERVICE ROLE key (bypasses RLS, for server use)
//
// Always use supabaseAdmin in backend routes so you can
// query any user's data securely from the server side.
// ============================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL      = process.env.SUPABASE_URL;
const ANON_KEY          = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Public client — for verifying user JWTs from the frontend
const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Admin client — for all DB operations on the server
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabaseAdmin };

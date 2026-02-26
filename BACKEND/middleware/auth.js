// ============================================
// middleware/auth.js — Supabase JWT Verification
// ============================================
// The frontend logs in via Supabase Auth and receives a JWT.
// It sends that JWT in the Authorization header.
// We verify it here using the Supabase admin client.
// ============================================

const { supabaseAdmin } = require('../utils/supabase');

const protect = async (req, res, next) => {
  let token;

  // Extract Bearer token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
  }

  try {
    // Verify the Supabase JWT and get the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
    }

    // Attach user to request for use in route handlers
    req.user = user;      // Contains: id, email, user_metadata, etc.
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

module.exports = { protect };

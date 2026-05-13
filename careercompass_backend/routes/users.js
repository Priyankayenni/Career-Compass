// ── routes/users.js ───────────────────────────────────────────────────────────
const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/users/internships — filtered internships for current user
router.get('/internships', requireAuth, async (req, res, next) => {
  try {
    const userResult = await query(
      'SELECT education_level, branch_id, stream FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

    const u = userResult.rows[0];
    const result = await query(`
      SELECT * FROM internships
      WHERE is_active = true
        AND is_verified = true
        AND is_paid_to_apply = false
        AND (streams = '[]'::jsonb OR streams @> $1::jsonb OR streams @> $2::jsonb)
      ORDER BY created_at DESC
    `, [
      JSON.stringify([u.education_level]),
      JSON.stringify([u.branch_id || u.stream || '']),
    ]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/stats — dashboard stats for user
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const [roadmaps, tests, posts] = await Promise.all([
      query('SELECT COUNT(*) FROM roadmaps WHERE user_id = $1 AND is_active = true', [req.user.id]),
      query('SELECT COUNT(*) FROM test_attempts WHERE user_id = $1', [req.user.id]),
      query('SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_active = true', [req.user.id]),
    ]);

    res.json({
      roadmapsGenerated: parseInt(roadmaps.rows[0].count),
      testsTaken: parseInt(tests.rows[0].count),
      postsCreated: parseInt(posts.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/account — soft delete
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
    res.json({ success: true, message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

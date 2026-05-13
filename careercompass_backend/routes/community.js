// ── routes/community.js ───────────────────────────────────────────────────────
const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/community/posts?tag=placement&limit=20
router.get('/posts', optionalAuth, async (req, res, next) => {
  try {
    const { tag, limit = 20, offset = 0 } = req.query;
    let whereClause = 'p.is_active = true';
    const params = [];
    let i = 1;

    if (tag) {
      whereClause += ` AND p.tags @> $${i++}::jsonb`;
      params.push(JSON.stringify([tag]));
    }

    const result = await query(`
      SELECT p.id, p.author_name, p.author_meta, p.content,
             p.tags, p.likes, p.is_pinned, p.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', r.id,
                   'authorName', r.author_name,
                   'authorRole', r.author_role,
                   'content', r.content,
                   'createdAt', r.created_at
                 ) ORDER BY r.created_at
               ) FILTER (WHERE r.id IS NOT NULL),
               '[]'
             ) as replies
      FROM posts p
      LEFT JOIN post_replies r ON r.post_id = p.id AND r.is_active = true
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/community/posts — works for both logged-in users and guests
router.post('/posts', optionalAuth, async (req, res, next) => {
  try {
    const { content, tags, guestName, guestMeta } = req.body;
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ error: 'Post content must be at least 10 characters' });
    }

    let authorName = guestName || 'Anonymous';
    let authorMeta = guestMeta || 'Student';
    let userId = null;

    // If logged in, use real profile data
    if (req.user) {
      userId = req.user.id;
      const userResult = await query(
        'SELECT name, education_level, branch_id, city FROM users WHERE id = $1',
        [req.user.id]
      );
      if (userResult.rows.length) {
        const u = userResult.rows[0];
        authorName = u.name;
        authorMeta = [u.education_level, u.branch_id, u.city].filter(Boolean).join(' · ');
      }
    }

    const result = await query(`
      INSERT INTO posts (user_id, author_name, author_meta, content, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, author_name, author_meta, content, tags, likes, created_at
    `, [userId, authorName, authorMeta, content.trim(), JSON.stringify(tags || [])]);

    res.status(201).json({ ...result.rows[0], replies: [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/community/posts/:id/reply — works for both logged-in and guests
router.post('/posts/:id/reply', optionalAuth, async (req, res, next) => {
  try {
    const { content, guestName, guestRole } = req.body;
    if (!content || content.trim().length < 3) {
      return res.status(400).json({ error: 'Reply too short' });
    }

    const post = await query('SELECT id FROM posts WHERE id = $1 AND is_active = true', [req.params.id]);
    if (!post.rows.length) return res.status(404).json({ error: 'Post not found' });

    let authorName = guestName || 'Anonymous';
    let authorRole = guestRole || 'Student';
    let userId = null;

    if (req.user) {
      userId = req.user.id;
      const userResult = await query(
        'SELECT name, education_level, branch_id FROM users WHERE id = $1',
        [req.user.id]
      );
      if (userResult.rows.length) {
        const u = userResult.rows[0];
        authorName = u.name;
        authorRole = [u.education_level, u.branch_id].filter(Boolean).join(' · ');
      }
    }

    const result = await query(`
      INSERT INTO post_replies (post_id, user_id, author_name, author_role, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, author_name, author_role, content, created_at
    `, [req.params.id, userId, authorName, authorRole, content.trim()]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/community/posts/:id/like
router.post('/posts/:id/like', optionalAuth, async (req, res, next) => {
  try {
    await query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

// ── routes/careers.js ─────────────────────────────────────────────────────────
const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const marketRefresh = require('../services/marketRefresh');

// GET /api/careers?branch=cse&category=AI/ML&demand=high&q=engineer
router.get('/', async (req, res, next) => {
  try {
    const { branch, category, demand, q, limit = 100, offset = 0 } = req.query;
    const conditions = ['is_active = true'];
    const params = [];
    let i = 1;

    if (branch) { conditions.push(`branch = $${i++}`); params.push(branch); }
    if (category) { conditions.push(`category = $${i++}`); params.push(category); }
    if (demand) { conditions.push(`demand = $${i++}`); params.push(demand); }
    if (q) {
      conditions.push(`(name ILIKE $${i} OR entry_role ILIKE $${i})`);
      params.push(`%${q}%`); i++;
    }

    const where = conditions.join(' AND ');
    const result = await query(`
      SELECT id, branch, category, icon, name, entry_role,
             salary_display, demand, demand_score,
             required_skills, projects_needed, project_ideas,
             companies_ts, companies_top, growth_path,
             is_trending, is_emerging, last_market_update
      FROM careers
      WHERE ${where}
      ORDER BY demand_score DESC, name ASC
      LIMIT $${i++} OFFSET $${i++}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get categories for this branch
    let categories = [];
    if (branch) {
      const catResult = await query(
        'SELECT DISTINCT category FROM careers WHERE branch = $1 AND is_active = true ORDER BY category',
        [branch]
      );
      categories = catResult.rows.map(r => r.category);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM careers WHERE ${where}`,
      params
    );

    res.json({
      careers: result.rows,
      total: parseInt(countResult.rows[0].count),
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/careers/branches — get all branch summaries
router.get('/branches', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT branch,
             COUNT(*) as career_count,
             COUNT(*) FILTER (WHERE is_trending) as trending_count,
             COUNT(*) FILTER (WHERE demand = 'high') as high_demand_count,
             MAX(last_market_update) as last_updated
      FROM careers
      WHERE is_active = true
      GROUP BY branch
      ORDER BY branch
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/careers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM careers WHERE id = $1 AND is_active = true', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Career not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/careers/refresh — trigger manual market refresh (admin/cron only)
router.post('/refresh', requireAuth, async (req, res, next) => {
  try {
    // Simple admin check — extend with proper admin role if needed
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
    if (!adminEmails.includes(req.user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Run async — don't await
    marketRefresh.runRefresh().catch(err => console.error('Manual refresh failed:', err));

    res.json({ message: 'Market refresh started — check logs for progress' });
  } catch (err) {
    next(err);
  }
});

// GET /api/careers/refresh/logs — last 5 refresh runs
router.get('/refresh/logs', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM market_refresh_log
      ORDER BY started_at DESC LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

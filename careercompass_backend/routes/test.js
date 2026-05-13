// ── routes/test.js ────────────────────────────────────────────────────────────
const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/test/questions?educationLevel=btech_3
router.get('/questions', async (req, res) => {
  const { educationLevel } = req.query;
  if (!educationLevel) return res.status(400).json({ error: 'educationLevel required' });

  // Return question set based on education level
  // In production these come from DB; here we return the same questions as the frontend
  const is10th = educationLevel === '10th';
  const count = is10th ? 20 : 14;

  res.json({
    educationLevel,
    questionCount: count,
    testType: is10th ? 'Subject Knowledge (AP/TS SSC)' : 'Skills Assessment',
    instructions: is10th
      ? 'Answer based on your AP/TS SSC Board syllabus only. No aptitude or general knowledge questions.'
      : 'Answer honestly — this test calibrates your roadmap to your real skill level.',
  });
});

// POST /api/test/submit — save test result
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { educationLevel, questions, scores, recommended, durationSecs } = req.body;

    if (!scores) return res.status(400).json({ error: 'scores required' });

    // Save test attempt
    const attempt = await query(`
      INSERT INTO test_attempts (user_id, education_level, questions, scores, recommended, duration_secs)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [
      req.user.id, educationLevel,
      JSON.stringify(questions || []),
      JSON.stringify(scores),
      recommended || null,
      durationSecs || null,
    ]);

    // Update user's test results
    const updateFields = ['test_results = $1'];
    const updateParams = [JSON.stringify(scores)];
    let paramIdx = 2;

    if (recommended) {
      updateFields.push(`recommended_stream = $${paramIdx++}`);
      updateParams.push(recommended);
    }

    updateParams.push(req.user.id);
    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
      updateParams
    );

    res.json({
      attemptId: attempt.rows[0].id,
      scores,
      recommended: recommended || null,
      message: 'Test results saved',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/test/history — user's past test attempts
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, education_level, scores, recommended, duration_secs, created_at
      FROM test_attempts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

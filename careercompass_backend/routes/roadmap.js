// ── routes/roadmap.js — Dual roadmap generation via Claude API ────────────────
const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/roadmap — get user's saved roadmaps
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT r.*, c.name as career_name, c.icon as career_icon, c.entry_role
      FROM roadmaps r
      LEFT JOIN careers c ON r.career_id = c.id
      WHERE r.user_id = $1 AND r.is_active = true
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/roadmap/generate — generate AI-powered roadmap
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { careerId, roadmapType = 'interest' } = req.body;

    if (!careerId) return res.status(400).json({ error: 'careerId required' });
    if (!['interest', 'test_score', 'standard'].includes(roadmapType)) {
      return res.status(400).json({ error: 'Invalid roadmapType' });
    }

    // Get career details
    const careerResult = await query('SELECT * FROM careers WHERE id = $1', [careerId]);
    if (!careerResult.rows.length) return res.status(404).json({ error: 'Career not found' });
    const career = careerResult.rows[0];

    // Get user profile for context
    const userResult = await query(`
      SELECT education_level, stream, specialization, branch_id, cgpa,
             current_projects, has_internship, skills, interests,
             test_results, goal, priority, city
      FROM users WHERE id = $1
    `, [req.user.id]);
    const user = userResult.rows[0];

    // Build the Claude prompt
    const systemPrompt = `You are CareerCompass, an expert career guidance AI for students in Andhra Pradesh and Telangana, India.
You create highly specific, actionable roadmaps — not generic advice.
Always include: specific resources (free ones preferred), realistic timelines, project ideas with tech stacks, and honest salary context.
Return ONLY valid JSON matching the specified schema.`;

    const userContext = `
Student Profile:
- Education: ${user.education_level}
- Branch/Stream: ${user.specialization || user.stream || user.branch_id || 'Not specified'}
- CGPA: ${user.cgpa || 'Not specified'}
- Projects built: ${user.current_projects || 0}
- Has internship: ${user.has_internship ? 'Yes' : 'No'}
- Skills: ${(user.skills || []).join(', ') || 'None listed'}
- Interests: ${(user.interests || []).join(', ') || 'None listed'}
- City: ${user.city || 'Hyderabad (assumed)'}
- Goal: ${user.goal || 'Not specified'}
${roadmapType === 'test_score' && user.test_results
  ? `- Test scores: ${JSON.stringify(user.test_results)}`
  : ''}

Target Career: ${career.name}
Entry Role: ${career.entry_role}
Required Skills: ${(career.required_skills || []).join(', ')}
Roadmap Type: ${roadmapType === 'interest' ? 'Interest-Based (direct path to this career)' : 'Test-Score-Based (calibrated to actual skill level)'}`;

    const schema = `Return this exact JSON structure (no markdown, no explanation, just JSON):
{
  "phases": [
    {
      "phase": "Phase 1 · Now",
      "title": "Short motivating title",
      "duration": "2-3 months",
      "tasks": ["Specific task 1", "Specific task 2", "Specific task 3", "Specific task 4"],
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "projects": [
        {
          "number": 1,
          "name": "Project Name",
          "description": "One sentence: what it does and why it matters",
          "tech": ["Tech1", "Tech2"],
          "demonstrates": "What skill/competency this proves"
        }
      ],
      "salary_context": "Only include in last phase: realistic salary info"
    }
  ],
  "summary": "2-sentence personalized summary of this roadmap for this student",
  "time_to_first_job": "e.g. 8-12 months from now",
  "key_risks": ["Risk 1 specific to this student", "Risk 2"]
}`;

    // Call Claude API with streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `${userContext}\n\n${schema}\n\nGenerate a ${roadmapType} roadmap with 4-5 phases. Be specific to this student's current situation — start from where they are RIGHT NOW, not from scratch.`,
      }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Parse and save the roadmap
    try {
      const cleaned = fullResponse.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Save to DB
      const saved = await query(`
        INSERT INTO roadmaps (user_id, career_id, roadmap_type, phases, metadata, generated_by)
        VALUES ($1, $2, $3, $4, $5, 'claude')
        RETURNING id
      `, [
        req.user.id,
        careerId,
        roadmapType,
        JSON.stringify(parsed.phases),
        JSON.stringify({ summary: parsed.summary, timeToJob: parsed.time_to_first_job, risks: parsed.key_risks }),
      ]);

      res.write(`data: ${JSON.stringify({ done: true, roadmapId: saved.rows[0].id, meta: { summary: parsed.summary, timeToJob: parsed.time_to_first_job } })}\n\n`);
    } catch (parseErr) {
      res.write(`data: ${JSON.stringify({ done: true, parseError: true })}\n\n`);
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) next(err);
    else res.end();
  }
});

// GET /api/roadmap/:id — get specific saved roadmap
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT r.*, c.name as career_name, c.icon as career_icon,
             c.entry_role, c.salary_display, c.companies_ts, c.companies_top, c.growth_path
      FROM roadmaps r
      LEFT JOIN careers c ON r.career_id = c.id
      WHERE r.id = $1 AND r.user_id = $2
    `, [req.params.id, req.user.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Roadmap not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/roadmap/:id/progress — mark phase/task complete
router.patch('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const { phaseIndex, taskIndex, isComplete, notes } = req.body;

    // Upsert progress record
    await query(`
      INSERT INTO roadmap_progress (roadmap_id, user_id, phase_index, task_index, is_complete, notes, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (roadmap_id, phase_index, task_index)
      DO UPDATE SET is_complete = $5, notes = $6, completed_at = $7
    `, [
      req.params.id, req.user.id, phaseIndex,
      taskIndex !== undefined ? taskIndex : null,
      isComplete, notes || null,
      isComplete ? new Date() : null,
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

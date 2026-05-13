// ── routes/auth.js ────────────────────────────────────────────────────────────
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { query } = require('../models/db');
const { signToken, requireAuth } = require('../middleware/auth');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  // Onboarding profile fields
  educationLevel: Joi.string().required(),
  city: Joi.string().allow('').optional(),
  stream: Joi.string().allow('').optional(),
  specialization: Joi.string().allow('').optional(),
  branchId: Joi.string().allow('').optional(),
  collegeType: Joi.string().allow('').optional(),
  cgpa: Joi.number().min(0).max(10).allow(null).optional(),
  currentProjects: Joi.number().integer().min(0).optional(),
  hasInternship: Joi.boolean().optional(),
  goal: Joi.string().allow('').optional(),
  priority: Joi.string().allow('').optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  interests: Joi.array().items(Joi.string()).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password, educationLevel, city, stream,
            specialization, branchId, collegeType, cgpa, currentProjects,
            hasInternship, goal, priority, skills, interests } = value;

    // Check duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(`
      INSERT INTO users (
        name, email, password_hash, education_level, city,
        stream, specialization, branch_id, college_type,
        cgpa, current_projects, has_internship,
        goal, priority, skills, interests
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id, name, email, education_level, branch_id, created_at
    `, [
      name, email.toLowerCase(), passwordHash, educationLevel, city || null,
      stream || null, specialization || null, branchId || null, collegeType || null,
      cgpa || null, currentProjects || 0, hasInternship || false,
      goal || null, priority || null,
      JSON.stringify(skills || []), JSON.stringify(interests || []),
    ]);

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        branchId: user.branch_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = value;

    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        educationLevel: user.education_level,
        stream: user.stream,
        specialization: user.specialization,
        branchId: user.branch_id,
        city: user.city,
        cgpa: user.cgpa,
        currentProjects: user.current_projects,
        hasInternship: user.has_internship,
        skills: user.skills,
        interests: user.interests,
        goal: user.goal,
        priority: user.priority,
        testResults: user.test_results,
        recommendedStream: user.recommended_stream,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — get current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, email, education_level, stream, specialization,
             branch_id, city, cgpa, current_projects, has_internship,
             skills, interests, goal, priority, test_results,
             recommended_stream, notifications, language, created_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email,
      educationLevel: u.education_level, stream: u.stream,
      specialization: u.specialization, branchId: u.branch_id,
      city: u.city, cgpa: u.cgpa, currentProjects: u.current_projects,
      hasInternship: u.has_internship, skills: u.skills, interests: u.interests,
      goal: u.goal, priority: u.priority, testResults: u.test_results,
      recommendedStream: u.recommended_stream, notifications: u.notifications,
      language: u.language, createdAt: u.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile — update profile
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'city', 'cgpa', 'current_projects', 'has_internship',
                     'goal', 'priority', 'skills', 'interests', 'notifications', 'language'];
    const updates = {};
    const values = [];
    let i = 1;

    const fieldMap = {
      name: 'name', city: 'city', cgpa: 'cgpa',
      currentProjects: 'current_projects', hasInternship: 'has_internship',
      goal: 'goal', priority: 'priority', skills: 'skills', interests: 'interests',
      notifications: 'notifications', language: 'language',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) {
        updates[col] = `$${i++}`;
        values.push(
          Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key]
        );
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.user.id);
    const setClause = Object.entries(updates).map(([col, placeholder]) => `${col} = ${placeholder}`).join(', ');

    await query(`UPDATE users SET ${setClause} WHERE id = $${i}`, values);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

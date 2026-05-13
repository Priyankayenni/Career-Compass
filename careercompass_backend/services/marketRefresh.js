// ── services/marketRefresh.js — Weekly AI-powered market data refresh ─────────
// Runs every Sunday 2AM IST — updates careers AND internships automatically
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../models/db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runRefresh() {
  const logResult = await query(
    `INSERT INTO market_refresh_log (status) VALUES ('running') RETURNING id`, []
  );
  const logId = logResult.rows[0].id;
  let careersUpdated = 0, newRolesAdded = 0, newInternshipsAdded = 0, expiredInternships = 0, tokensUsed = 0;

  try {
    console.log('[MarketRefresh] Starting weekly refresh...');

    // ── PART 1: Career demand + new roles ────────────────────────────────────
    const branches = ['cse', 'ece', 'mech', 'civil', 'eee', 'ca', 'bipc'];
    for (const branch of branches) {
      console.log(`[MarketRefresh] Careers: ${branch}`);
      const existing = await query('SELECT id, name, demand FROM careers WHERE branch = $1 AND is_active = true', [branch]);
      const existingNames = existing.rows.map(r => r.name);
      const result = await refreshBranch(branch, existingNames);
      tokensUsed += result.tokensUsed;

      for (const update of result.updates) {
        const career = existing.rows.find(r => r.name === update.name);
        if (career && career.demand !== update.demand) {
          await query(
            `UPDATE careers SET demand=$1, demand_score=$2, is_trending=$3, is_emerging=$4, last_market_update=NOW() WHERE id=$5`,
            [update.demand, update.demandScore, update.isTrending||false, update.isEmerging||false, career.id]
          );
          careersUpdated++;
        }
      }

      for (const newRole of result.newRoles) {
        try {
          await query(
            `INSERT INTO careers (branch,category,icon,name,entry_role,salary_display,salary_min,salary_max,demand,demand_score,required_skills,projects_needed,project_ideas,companies_ts,companies_top,growth_path,is_trending,is_emerging,last_market_update)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW()) ON CONFLICT DO NOTHING`,
            [branch, newRole.category, newRole.icon||'⚡', newRole.name, newRole.entry_role,
             newRole.salary_display, newRole.salary_min||3, newRole.salary_max||20,
             newRole.demand||'medium', newRole.demand_score||5,
             JSON.stringify(newRole.required_skills||[]), newRole.projects_needed||2,
             JSON.stringify(newRole.project_ideas||[]), JSON.stringify(newRole.companies_ts||[]),
             JSON.stringify(newRole.companies_top||[]), newRole.growth_path||'',
             newRole.is_trending||false, newRole.is_emerging||false]
          );
          newRolesAdded++;
        } catch (e) {
          console.error(`[MarketRefresh] Role insert failed: ${newRole.name}`, e.message);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    // ── PART 2: Expire old internships ───────────────────────────────────────
    console.log('[MarketRefresh] Checking expired internships...');
    expiredInternships = await markExpiredInternships();
    console.log(`[MarketRefresh] Expired: ${expiredInternships} internships`);

    // ── PART 3: Find new internships ─────────────────────────────────────────
    const streams = [
      { stream:'cse',   label:'Computer Science / Software Engineering' },
      { stream:'ece',   label:'Electronics & Communication Engineering' },
      { stream:'mech',  label:'Mechanical Engineering' },
      { stream:'civil', label:'Civil Engineering' },
      { stream:'eee',   label:'Electrical Engineering' },
      { stream:'ca',    label:'Commerce / CA / Finance' },
      { stream:'bipc',  label:'Medical / Pharmacy / Biotech' },
    ];

    for (const { stream, label } of streams) {
      console.log(`[MarketRefresh] Internships: ${stream}`);
      const existing = await query(
        `SELECT company, role FROM internships WHERE is_active=true AND branches @> $1::jsonb`,
        [JSON.stringify([stream])]
      );
      const existingKeys = new Set(existing.rows.map(r => `${r.company}||${r.role}`));
      const result = await refreshInternships(stream, label);
      tokensUsed += result.tokensUsed;

      for (const intern of result.newInternships) {
        const key = `${intern.company}||${intern.role}`;
        if (existingKeys.has(key)) continue;
        try {
          await query(
            `INSERT INTO internships (emoji,company,role,duration,stipend,deadline,streams,branches,min_year,skills,apply_url,is_verified,is_paid_to_apply,is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,false,true) ON CONFLICT DO NOTHING`,
            [intern.emoji||'🏢', intern.company, intern.role,
             intern.duration||'2–3 months', intern.stipend||'Varies',
             intern.deadline||'Rolling',
             JSON.stringify(intern.streams||[stream]),
             JSON.stringify(intern.branches||[stream]),
             intern.min_year||2,
             JSON.stringify(intern.skills||[]),
             intern.apply_url||null]
          );
          newInternshipsAdded++;
          console.log(`[MarketRefresh] + Internship: ${intern.company} — ${intern.role}`);
        } catch (e) {
          console.error(`[MarketRefresh] Internship insert failed: ${intern.company}`, e.message);
        }
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    await query(
      `UPDATE market_refresh_log SET status='success', completed_at=NOW(), careers_updated=$1, new_roles_added=$2, claude_tokens_used=$3 WHERE id=$4`,
      [careersUpdated, newRolesAdded + newInternshipsAdded, tokensUsed, logId]
    );

    console.log(`[MarketRefresh] ✅ Done`);
    console.log(`  Careers updated:     ${careersUpdated}`);
    console.log(`  New career roles:    ${newRolesAdded}`);
    console.log(`  New internships:     ${newInternshipsAdded}`);
    console.log(`  Expired internships: ${expiredInternships}`);
    console.log(`  Total tokens used:   ${tokensUsed}`);
    return { careersUpdated, newRolesAdded, newInternshipsAdded, expiredInternships, tokensUsed };

  } catch (err) {
    console.error('[MarketRefresh] ❌ Failed:', err.message);
    await query(
      `UPDATE market_refresh_log SET status='failed', completed_at=NOW(), error_message=$1 WHERE id=$2`,
      [err.message, logId]
    );
    throw err;
  }
}

// ── EXPIRE OLD INTERNSHIPS ────────────────────────────────────────────────────
async function markExpiredInternships() {
  const monthMap = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
  };
  const now = new Date();
  const active = await query(
    `SELECT id, deadline FROM internships WHERE is_active=true AND deadline != 'Rolling'`, []
  );
  let expired = 0;
  for (const i of active.rows) {
    try {
      const parts = i.deadline.replace(',','').split(' ');
      if (parts.length < 2) continue;
      const month = monthMap[parts[0].substring(0,3)];
      const day = parseInt(parts[1]);
      if (month === undefined || isNaN(day)) continue;
      const deadlineDate = new Date(now.getFullYear(), month, day);
      if (deadlineDate < now) {
        await query(`UPDATE internships SET is_active=false WHERE id=$1`, [i.id]);
        expired++;
      }
    } catch (_) {}
  }
  return expired;
}

// ── FIND NEW INTERNSHIPS VIA CLAUDE + WEB SEARCH ─────────────────────────────
async function refreshInternships(stream, streamLabel) {
  const prompt = `You are an internship research assistant for students in Andhra Pradesh and Telangana, India.

Current date: ${new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}

Search the web RIGHT NOW for currently open internship opportunities in India for: ${streamLabel} students.

Rules — ONLY include internships that are:
1. Currently open and accepting applications today
2. Completely FREE to apply — no application fee
3. From real verified companies or government organisations in India
4. Suitable for B.Tech or B.Sc students in Year 2, 3 or 4
5. Based in India — Hyderabad / AP / Telangana preferred but pan-India is fine

Search for at least 4 internships. Verify each one is real and currently open.

Return ONLY valid JSON — no markdown, no explanation:
{
  "newInternships": [
    {
      "emoji": "single emoji for the company type",
      "company": "Exact company name",
      "role": "Exact internship title",
      "duration": "e.g. 2 months",
      "stipend": "e.g. Rs.10000/mo or Unpaid",
      "deadline": "e.g. Apr 30 or Rolling",
      "streams": ["btech"],
      "branches": ["${stream}"],
      "min_year": 2,
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "apply_url": "https://actual-application-url.com"
    }
  ]
}

CRITICAL: Only include internships you actually found via web search.
If none found, return: {"newInternships": []}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  });

  const tokensUsed = (response.usage?.input_tokens||0) + (response.usage?.output_tokens||0);
  const text = response.content.filter(b => b.type==='text').map(b => b.text).join('');

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g,'').trim();
    const parsed = JSON.parse(cleaned);
    return { newInternships: parsed.newInternships||[], tokensUsed };
  } catch (e) {
    console.error(`[MarketRefresh] Internship JSON parse error (${stream}):`, e.message);
    return { newInternships: [], tokensUsed };
  }
}

// ── BRANCH-LEVEL CAREER REFRESH ───────────────────────────────────────────────
async function refreshBranch(branch, existingNames) {
  const branchLabels = {
    cse:'Computer Science & Software Engineering',
    ece:'Electronics & Communication Engineering',
    mech:'Mechanical Engineering',
    civil:'Civil Engineering',
    eee:'Electrical & Electronics Engineering',
    ca:'Chartered Accountancy & Commerce/Finance',
    bipc:'Medicine, Pharmacy & Biotech',
  };

  const prompt = `You are a job market analyst for India, AP/Telangana region.
Current date: ${new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' })}
Field: "${branchLabels[branch]}"

Task 1 — Update demand for these existing roles: ${existingNames.slice(0,30).join(', ')}
Task 2 — Find 2-3 new roles that emerged in India in the last 6 months NOT in the list above.

Return ONLY JSON:
{
  "updates": [
    {
      "name": "exact role name from list above",
      "demand": "high|medium|low",
      "demandScore": 7,
      "isTrending": true,
      "isEmerging": false
    }
  ],
  "newRoles": [
    {
      "name": "New Role Title",
      "category": "Category",
      "icon": "emoji",
      "entry_role": "Junior Title",
      "salary_display": "Rs.X-Y LPA",
      "salary_min": 4,
      "salary_max": 20,
      "demand": "high",
      "demandScore": 7,
      "required_skills": ["s1","s2","s3","s4","s5"],
      "projects_needed": 2,
      "project_ideas": ["p1","p2"],
      "companies_ts": ["Company Hyderabad"],
      "companies_top": ["Top Company"],
      "growth_path": "Junior to Senior to Lead",
      "is_trending": true,
      "is_emerging": true
    }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
  });

  const tokensUsed = (response.usage?.input_tokens||0) + (response.usage?.output_tokens||0);
  const text = response.content.filter(b => b.type==='text').map(b => b.text).join('');

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g,'').trim();
    const parsed = JSON.parse(cleaned);
    return { updates: parsed.updates||[], newRoles: parsed.newRoles||[], tokensUsed };
  } catch (e) {
    console.error(`[MarketRefresh] JSON parse error (${branch}):`, e.message);
    return { updates: [], newRoles: [], tokensUsed };
  }
}

// ── CRON SCHEDULER ────────────────────────────────────────────────────────────
function startCron() {
  const cronExpr = process.env.MARKET_REFRESH_CRON || '30 20 * * 6';
  cron.schedule(cronExpr, async () => {
    console.log(`[MarketRefresh] Cron triggered at ${new Date().toISOString()}`);
    try { await runRefresh(); }
    catch (err) { console.error('[MarketRefresh] Cron failed:', err.message); }
  }, { timezone: 'Asia/Kolkata' });
  console.log(`[MarketRefresh] ✅ Cron scheduled — Every Sunday 2AM IST`);
  console.log(`[MarketRefresh]    Updates: careers + internships`);
}

module.exports = { runRefresh, startCron };
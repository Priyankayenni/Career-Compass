-- ── CareerCompass v4 — PostgreSQL Schema ────────────────────────────────────
-- Run: psql $DATABASE_URL -f scripts/schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy career search

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  city          VARCHAR(100),

  -- Education profile
  education_level   VARCHAR(50) NOT NULL,  -- btech_3, ca_foundation, etc.
  stream            VARCHAR(50),           -- mpc, bipc, mec, cec
  specialization    VARCHAR(150),          -- CSE (Computer Science & Engineering)
  branch_id         VARCHAR(20),           -- cse, ece, mech, etc.
  college_type      VARCHAR(20),           -- iit, nit, bits, jntu, private
  cgpa              DECIMAL(3,2),
  current_projects  INTEGER DEFAULT 0,
  has_internship    BOOLEAN DEFAULT FALSE,

  -- Career preferences
  goal              TEXT,
  priority          VARCHAR(50),           -- salary, impact, work-life, learning
  skills            JSONB DEFAULT '[]',    -- string[]
  interests         JSONB DEFAULT '[]',    -- string[]

  -- Test results
  test_results         JSONB,             -- {math:80, physics:60, ...}
  recommended_stream   VARCHAR(10),       -- mpc, bipc, mec, cec (10th only)
  selected_career_id   INTEGER,           -- FK to careers

  -- Meta
  notifications    BOOLEAN DEFAULT TRUE,
  language         VARCHAR(10) DEFAULT 'en',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_education ON users(education_level, branch_id);

-- ── CAREERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS careers (
  id               SERIAL PRIMARY KEY,
  branch           VARCHAR(20) NOT NULL,       -- cse, ece, mech, civil, eee, ca, bipc
  category         VARCHAR(60) NOT NULL,       -- Software, AI/ML, Cloud, etc.
  icon             VARCHAR(10),
  name             VARCHAR(150) NOT NULL,
  entry_role       VARCHAR(200),
  salary_display   VARCHAR(50),                -- '₹5–40 LPA'
  salary_min       INTEGER,                    -- in LPA (for sorting/filtering)
  salary_max       INTEGER,
  demand           VARCHAR(10) DEFAULT 'medium', -- high, medium, low
  demand_score     INTEGER DEFAULT 5,          -- 1-10 for ranking
  required_skills  JSONB NOT NULL DEFAULT '[]',
  projects_needed  INTEGER DEFAULT 2,
  project_ideas    JSONB NOT NULL DEFAULT '[]',
  companies_ts     JSONB NOT NULL DEFAULT '[]', -- Telangana/AP companies
  companies_top    JSONB NOT NULL DEFAULT '[]',
  growth_path      TEXT,
  is_trending      BOOLEAN DEFAULT FALSE,
  is_emerging      BOOLEAN DEFAULT FALSE,
  is_active        BOOLEAN DEFAULT TRUE,
  ai_summary       TEXT,                       -- AI-generated 2-line summary
  last_market_update TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_careers_branch ON careers(branch);
CREATE INDEX IF NOT EXISTS idx_careers_demand ON careers(demand_score DESC);
CREATE INDEX IF NOT EXISTS idx_careers_name_trgm ON careers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_careers_category ON careers(branch, category);

-- ── ROADMAPS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmaps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  career_id       INTEGER REFERENCES careers(id) ON DELETE SET NULL,
  roadmap_type    VARCHAR(20) NOT NULL,    -- 'interest', 'test_score', 'standard'
  phases          JSONB NOT NULL,          -- array of phase objects
  metadata        JSONB DEFAULT '{}',      -- college switcher state, etc.
  is_active       BOOLEAN DEFAULT TRUE,
  generated_by    VARCHAR(20) DEFAULT 'template', -- 'template' or 'claude'
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id, roadmap_type);

-- ── ROADMAP PROGRESS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id          SERIAL PRIMARY KEY,
  roadmap_id  UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  phase_index INTEGER NOT NULL,
  task_index  INTEGER,
  is_complete BOOLEAN DEFAULT FALSE,
  notes       TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_roadmap ON roadmap_progress(roadmap_id, phase_index);

-- ── TEST ATTEMPTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_attempts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  education_level VARCHAR(50),
  questions     JSONB NOT NULL,            -- question objects with user answers
  scores        JSONB NOT NULL,            -- {math:80, physics:60, ...}
  recommended   VARCHAR(10),              -- stream recommendation (10th only)
  duration_secs INTEGER,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_user ON test_attempts(user_id, created_at DESC);

-- ── INTERNSHIPS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id            SERIAL PRIMARY KEY,
  emoji         VARCHAR(10),
  company       VARCHAR(200) NOT NULL,
  role          VARCHAR(200) NOT NULL,
  duration      VARCHAR(50),
  stipend       VARCHAR(50),
  deadline      VARCHAR(50),
  streams       JSONB NOT NULL DEFAULT '[]',
  branches      JSONB NOT NULL DEFAULT '[]',
  min_year      INTEGER DEFAULT 1,
  skills        JSONB NOT NULL DEFAULT '[]',
  apply_url     VARCHAR(500),
  is_verified   BOOLEAN DEFAULT TRUE,
  is_paid_to_apply BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internships_active ON internships(is_active, is_verified);

-- ── COMMUNITY POSTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100),               -- denormalized for display
  author_meta VARCHAR(200),               -- "BTech 3rd Year, CSE — Hyderabad"
  content     TEXT NOT NULL,
  tags        JSONB DEFAULT '[]',
  likes       INTEGER DEFAULT 0,
  is_pinned   BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

-- ── POST REPLIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100),
  author_role VARCHAR(200),
  content     TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON post_replies(post_id, created_at);

-- ── MARKET REFRESH LOG ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_refresh_log (
  id            SERIAL PRIMARY KEY,
  started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at  TIMESTAMP WITH TIME ZONE,
  careers_updated INTEGER DEFAULT 0,
  new_roles_added INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'running', -- running, success, failed
  error_message TEXT,
  claude_tokens_used INTEGER
);

-- ── UPDATE TRIGGER ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER careers_updated_at
  BEFORE UPDATE ON careers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

// ── CareerCompass Backend — server.js ────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./models/db');
const authRoutes = require('./routes/auth');
const careerRoutes = require('./routes/careers');
const roadmapRoutes = require('./routes/roadmap');
const testRoutes = require('./routes/test');
const communityRoutes = require('./routes/community');
const userRoutes = require('./routes/users');
const marketRefresh = require('./services/marketRefresh');

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again after 15 minutes.' },
});
app.use('/api/', limiter);

// Stricter limiter for AI routes
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'AI request limit reached — please wait 1 minute.' },
});

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/roadmap', aiLimiter, roadmapRoutes);
app.use('/api/test', testRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  });
});

// ── START ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    console.log('✅ Database connected');

    if (process.env.MARKET_REFRESH_ENABLED === 'true') {
      marketRefresh.startCron();
      console.log('✅ Market refresh cron started');
    }

    app.listen(PORT, () => {
      console.log(`\n🧭 CareerCompass API running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
      console.log(`   Frontend:    ${process.env.FRONTEND_URL}\n`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

start();

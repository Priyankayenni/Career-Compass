# CareerCompass — Simple Deployment Guide

> 🚀 Deploy your CareerCompass platform in under 15 minutes!

---

## Overview

CareerCompass consists of two parts:

| Component | Description | Deployment Target |
|-----------|-------------|-------------------|
| **Frontend** | Single HTML file (`careercompass_v4.html`) | Vercel (free) |
| **Backend** | Node.js + Express API server | Railway (free tier available) |

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│  Frontend (Vercel)          │  API    │  Backend (Railway)          │
│  careercompass_v4.html      │ ──────▶ │  Node.js + Express          │
│  HTML + Tailwind + Vanilla JS│        │  PostgreSQL + Claude AI     │
└─────────────────────────────┘         └─────────────────────────────┘
```

---

## Part 1: Deploy Backend (Railway)

### Step 1: Push Code to GitHub

```bash
# Make sure your code is on GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository: `Final-Career-Compass`
5. Railway will auto-detect Node.js and configure the build

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will provision a PostgreSQL database automatically
3. The `DATABASE_URL` environment variable will be set automatically ✅

### Step 4: Set Environment Variables

In Railway dashboard, go to your project → **Variables** tab → Click **"Raw Editor"** and add:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
JWT_SECRET=your_random_secret_minimum_40_characters_long_xyz_abc_123
FRONTEND_URL=https://your-app.vercel.app

# Optional
NODE_ENV=production
MARKET_REFRESH_ENABLED=true
MARKET_REFRESH_CRON=30 20 * * 6
ADMIN_EMAILS=your-email@example.com
```

> ⚠️ **Important:** Replace `YOUR_KEY_HERE` with your actual Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Step 5: Run Database Migrations

Open Railway's **"Shell"** (in your project dashboard) and run:

```bash
node scripts/migrate.js
```

You should see: `✅ Migration completed successfully!`

### Step 6: Deploy!

Railway automatically deploys on push. Your backend is now live!

📋 **Copy your backend URL** (e.g., `https://career-compass-backend-production.up.railway.app`)

---

## Part 2: Deploy Frontend (Vercel)

### Step 1: Update API URL in HTML

Open `careercompass_v4.html` and find line ~439:

```javascript
const API_BASE = null; // ← CHANGE THIS to your backend URL
```

Replace with your Railway backend URL:

```javascript
const API_BASE = 'https://your-backend.railway.app/api';
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your GitHub repository: `Final-Career-Compass`
5. Configure the project:
   - **Framework Preset:** Select **"Other"**
   - **Build Command:** Leave **empty**
   - **Output Directory:** Leave as-is
6. Click **"Deploy"**

### Step 3: Done!

Vercel will deploy your frontend in seconds.

📋 **Copy your frontend URL** (e.g., `https://career-compass.vercel.app`)

---

## Part 3: Final Configuration

### Update Backend FRONTEND_URL

Go back to Railway and update the `FRONTEND_URL` variable with your new Vercel URL:

```env
FRONTEND_URL=https://your-app.vercel.app
```

This enables CORS so your frontend can communicate with the backend.

### Test Your Deployment

1. Open your Vercel URL in a browser
2. Complete the onboarding flow
3. Take the career aptitude test
4. Verify AI roadmaps are generating

---

## Troubleshooting

### Frontend can't connect to backend

**Error:** `Failed to fetch` or `NetworkError`

**Solution:**
1. Check that `API_BASE` in `careercompass_v4.html` is correct
2. Ensure `FRONTEND_URL` in Railway matches your Vercel domain
3. Wait 1-2 minutes for Railway deployment to complete

### Database migration failed

**Error:** `relation "users" does not exist`

**Solution:**
1. Open Railway Shell
2. Run `node scripts/migrate.js` again
3. Check Railway logs for detailed error messages

### AI roadmaps not generating

**Error:** Roadmaps show but AI content is missing

**Solution:**
1. Verify `ANTHROPIC_API_KEY` is set correctly in Railway
2. Check that the key starts with `sk-ant-`
3. Ensure you have credits in your Anthropic account

### CORS errors in browser console

**Error:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solution:**
1. Update `FRONTEND_URL` in Railway to match your exact Vercel URL
2. Redeploy the backend (push a new commit or restart in Railway)

---

## Cost Estimate

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Railway Backend | 500 hours/month | **Free** (if under limit) |
| Railway PostgreSQL | 1GB storage | **Free** |
| Vercel Frontend | Unlimited | **Free** |
| Anthropic API | Pay per use | **~$2-5/month** |

**Total: ~$0-5/month** 🎉

---

## Updating Your Deployment

### Backend Updates
```bash
git push origin main
# Railway auto-deploys on push!
```

### Frontend Updates
1. Update `careercompass_v4.html`
2. Commit and push to GitHub
3. Vercel auto-deploys on push!

---

## Alternative Deployment Options

### Render (Backend)
1. Push to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Connect your repo
4. Add PostgreSQL from Supabase
5. Set environment variables

### Netlify (Frontend)
1. Drag and drop your `careercompass_v4.html` to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Or connect GitHub for auto-deployment

---

## Need Help?

- **GitHub Issues:** [Report a bug](https://github.com/Priyankayenni/Final-Career-Compass/issues)
- **Email:** [24215a3203@bvrit.ac.in](mailto:24215a3203@bvrit.ac.in)

---

<div align="center">

**🧭 CareerCompass — Deployed and ready to guide students!**

</div>
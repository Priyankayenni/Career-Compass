# CareerCompass — AP & Telangana

**A smart career guidance platform for Intermediate & B.Tech students of Andhra Pradesh & Telangana.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🧭 Personalized career roadmaps powered by AI — built specifically for students in Andhra Pradesh and Telangana.

---

## ✨ Features

### 🎯 Core Features
- **430+ Curated Careers** with real-time market demand tracking
- **Dual AI-Powered Roadmaps** — Test-based + Interest-based recommendations
- **Career Aptitude Test** with instant scoring based on AP/TS Board syllabus
- **Weekly Job Market Intelligence** powered by Claude AI
- **Community Feed & Senior Guidance** — Connect with experienced professionals
- **Profile Saving & Progress Tracking** — Never lose your roadmap

### 🎓 For Students
- **Stream Selection Guidance** — MPC, BiPC, MEC, CEC analysis
- **Engineering Branch Explorer** — CSE, ECE, AI&ML, Data Science & more
- **Exam Preparation Tracker** — EAMCET, JEE, NEET, CA, and more
- **Internship Finder** — Curated opportunities in Hyderabad, Vizag, Vijayawada

### 🤖 AI-Powered
- **Claude Sonnet Integration** for intelligent career recommendations
- **Personalized Roadmaps** based on your skills, interests, and goals
- **Market Demand Analysis** updated weekly via automated cron jobs

---

## 🚀 Live Demo

**[Add Vercel Link Here]**

---

## 📸 Screenshots

| ![Dashboard](https://via.placeholder.com/400x250/03070F/38BDF8?text=Dashboard) | ![Career Test](https://via.placeholder.com/400x250/03070F/34D399?text=Career+Test) |
|---|---|
| *Personalized Dashboard* | *Aptitude Test Interface* |

| ![Roadmap](https://via.placeholder.com/400x250/03070F/FBBF24?text=AI+Roadmap) | ![Careers](https://via.placeholder.com/400x250/03070F/818CF8?text=Career+Explorer) |
|---|---|
| *AI-Generated Roadmap* | *Career Explorer* |

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 + Tailwind CSS** — Beautiful, responsive UI
- **Vanilla JavaScript** — Fast, no-framework approach
- **Custom Animations** — Smooth transitions and micro-interactions

### Backend
- **Node.js + Express.js** — RESTful API server
- **PostgreSQL** — Reliable data storage (via Neon.tech)
- **JWT Authentication** — Secure user sessions

### AI & Integrations
- **Anthropic Claude (Sonnet)** — Advanced AI for career recommendations
- **Server-Sent Events (SSE)** — Real-time roadmap generation
- **Cron Jobs** — Weekly market data refresh

### Deployment
- **Vercel** — Frontend hosting (HTML file)
- **Railway** — Backend hosting with auto-scaling

---

## 📖 How to Use

### For Students (Using the Live Demo)

1. **Visit the live demo** at [your-vercel-url.vercel.app](#)
2. **Complete quick onboarding** — Tell us about your education, interests, and goals
3. **Take the aptitude test** OR **select your interests** to get personalized recommendations
4. **Explore your roadmap** — Get a semester-by-semester plan with projects, skills, and internships
5. **Save your progress** — Create an account to access your roadmap anytime

### Career Test Flow
```
Onboarding → Aptitude Test → Score Analysis → Stream Recommendation → Career Suggestions
```

### Dual Roadmap Options
- **Test-Based Roadmap**: Based on your aptitude test scores
- **Interest-Based Roadmap**: Based on your selected interests and goals

---

## 🖥️ Local Setup

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (free via Neon.tech or Supabase)
- Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com))

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/Priyankayenni/Final-Career-Compass.git
cd Final-Career-Compass

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your credentials:
# - DATABASE_URL (from Neon.tech or Supabase)
# - ANTHROPIC_API_KEY (from Anthropic console)
# - JWT_SECRET (generate a random 40+ char string)
# - FRONTEND_URL (http://localhost:5500 for local dev)

# Run database migrations
npm run migrate

# Start the development server
npm run dev
```

The backend will be available at `http://localhost:3001`

### Frontend Setup

**Option 1: Direct File Open**
```bash
# Simply open careercompass_v4.html in your browser
open careercompass_v4.html
```

**Option 2: Local Server (Recommended)**
```bash
# Install a simple HTTP server
npx serve .

# Or use Python
python -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

### ⚙️ Configuration

Update `careercompass_v4.html` line ~439:
```javascript
const API_BASE = 'http://localhost:3001/api'; // For local development
// const API_BASE = 'https://your-backend.railway.app/api'; // For production
```

---

## 🚀 Deployment

### Backend (Railway)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js and set up the build

3. **Add PostgreSQL Plugin**
   - In your Railway project, click "New" → "Database" → "PostgreSQL"
   - Railway will auto-provision a database and set `DATABASE_URL`

4. **Set Environment Variables**
   - Go to Variables tab in Railway
   - Add the following:
     - `ANTHROPIC_API_KEY` — Your Anthropic API key
     - `JWT_SECRET` — Your JWT secret (40+ characters)
     - `FRONTEND_URL` — Your Vercel frontend URL
     - `NODE_ENV` — `production`

5. **Deploy!**
   - Railway will automatically deploy on push
   - Copy your backend URL (e.g., `https://your-app.railway.app`)

### Frontend (Vercel)

1. **Prepare the HTML file**
   - Update `API_BASE` in `careercompass_v4.html` to your Railway backend URL:
     ```javascript
     const API_BASE = 'https://your-backend.railway.app/api';
     ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - **Framework Preset**: Select "Other"
   - **Build Command**: Leave empty
   - **Output Directory**: Leave as-is
   - Click "Deploy"

3. **Done!**
   - Your frontend is now live at `https://your-app.vercel.app`

---

## 📁 Project Structure

```
careercompass_backend/
├── careercompass_v4.html    # Frontend (single HTML file)
├── server.js                # Express server entry point
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   └── db.js                # Database connection
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── careers.js           # Career data endpoints
│   ├── community.js         # Community posts & replies
│   ├── roadmap.js           # AI roadmap generation (SSE)
│   ├── test.js              # Aptitude test endpoints
│   └── users.js             # User profile endpoints
├── services/
│   └── marketRefresh.js     # Weekly market data cron job
└── scripts/
    ├── migrate.js           # Database migration script
    └── schema.sql           # PostgreSQL schema definition
```

---

## 🔒 Security

- **JWT Authentication** — Secure token-based auth
- **CORS Protection** — Only your frontend URL can access the API
- **Environment Variables** — Sensitive keys never exposed
- **SQL Injection Protection** — Parameterized queries throughout
- **Rate Limiting** — Prevents API abuse

---

## 📊 Database Schema

The platform uses PostgreSQL with the following tables:
- `users` — User profiles and preferences
- `careers` — Career data with market demand
- `test_results` — Aptitude test scores
- `roadmaps` — AI-generated roadmaps
- `community_posts` — Community feed posts
- `community_replies` — Senior guidance replies
- `market_demand` — Weekly job market data

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Anthropic** for the incredible Claude AI
- **Vercel** for seamless frontend deployment
- **Railway** for easy backend hosting
- **Neon.tech** for serverless PostgreSQL
- **AP & Telangana Education Department** for inspiration

---

## 📞 Contact

**Priya** — [24215a3203@bvrit.ac.in](mailto:24215a3203@bvrit.ac.in)

Project Link: [https://github.com/Priyankayenni/Final-Career-Compass](https://github.com/Priyankayenni/Final-Career-Compass)

---

<div align="center">

**Made with ❤️ for the students of Andhra Pradesh & Telangana**

🧭 CareerCompass — Find Your Path to Success

</div>
# 🧭 CareerCompass — AP & Telangana

**Personalized AI-powered career guidance platform for Intermediate and B.Tech students of Andhra Pradesh & Telangana.**

[Live Demo](http://localhost:5174/login) *(Update after deployment)*

---

## ✨ Features

- **430+ Curated Careers** with real-time market demand scores
- **Dual AI Roadmaps** — Test-based + Interest-based (powered by Claude)
- **Career Aptitude Test** with instant scoring and recommendations
- **Weekly Job Market Intelligence** — Fresh trends every Sunday
- **Verified Internships** filtered by your stream & branch
- **Community Feed** — Ask doubts and get answers from seniors
- **Profile System** — Save progress, skills, CGPA, and projects
- **Beautiful Dark UI** with smooth animations and glassmorphic design

---

## 🛠 Tech Stack

**Frontend**: Single HTML + Tailwind CSS + Vanilla JavaScript + Framer Motion style animations  
**Backend**: Node.js + Express  
**Database**: PostgreSQL (Neon)  
**AI**: Anthropic Claude (Sonnet)  
**Authentication**: JWT + Local Storage  
**Deployment**: Vercel (Frontend) + Railway (Backend)

---

## 🚀 Quick Start (Local)

### Backend
```bash
cd "C:\Users\Priya\OneDrive\Desktop\Securaguard"
npm install
# Make sure .env is configured
npm run dev
Frontend
Just open careercompass_v4.html or careercompass_v5.html directly, or serve it:
Bashnpx serve .
Then open: http://localhost:3000/careercompass_v5.html
Update API_BASE in the HTML file to http://localhost:3001/api for full functionality.

📁 Project Structure
textSecuraguard/
├── careercompass_v5.html          # Main Frontend (Single File)
├── server.js                      # Backend Entry Point
├── package.json
├── .env
├── .env.example
├── docker-compose.yml
├── prisma/                        # Database schema & seed
├── README.md
└── DEPLOYMENT.md

🎯 Target Audience

Intermediate (10+2) students (BIPC, MPC, MEC, CEC)
B.Tech 1st to 3rd year students
Students confused between streams, colleges, or career paths
Parents and career counselors in India.


Deployment (Production)
See full guide → DEPLOYMENT.md
Recommended:

Frontend: Vercel (single HTML file)
Backend: Railway
Database: Neon PostgreSQL


Contributing
Pull requests and suggestions are welcome. This project aims to help thousands of students in AP & Telangana make better-informed career decisions.

Built with ❤️ for the students

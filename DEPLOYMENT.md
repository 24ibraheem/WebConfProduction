# Deployment Guide

This document covers deployment steps for the WebConference project.

## Option 1: Railway (Recommended - Monorepo)
This method deploys both the Frontend and Backend as a single service on Railway.

### Prerequisites
- A Railway account (railway.app)
- A MongoDB Atlas cluster (or use Railway's MongoDB plugin)
- A Gemini API Key

### Steps
1. **Push your code to GitHub.**
2. **Create a new project on Railway** and select "Deploy from GitHub repo".
3. **Select your repository.**
4. **Configure Variables:**
   - Go to the "Variables" tab.
   - Add `MONGO_URI`: Your MongoDB connection string.
   - Add `GEMINI_API_KEY`: Your Google Gemini API key.
   - Add `NODE_ENV`: `production`
5. **Settings:**
   - Railway should automatically detect the `start` script in `package.json`.
   - Build Command: `npm install && npm run build` (This installs dependencies and builds the frontend)
   - Start Command: `npm start` (This starts the backend, which serves the frontend)
6. **Deploy:**
   - Railway will build and deploy.
   - Once deployed, Railway will provide a public URL (e.g., `https://web-conference-production.up.railway.app`).
   - Open this URL to use the app.

### How it works
- The root `package.json` now includes all dependencies (frontend + backend).
- `npm run build` creates the frontend static files in `dist/`.
- `npm start` runs `server/server.js`.
- `server/server.js` is configured to serve the static files from `dist/` when in production.
- The frontend automatically connects to the backend on the same domain.

---

## Option 2: Separate Services (Vercel + Render/Railway)
(Legacy method - use if you want to scale frontend and backend independently)

1) Frontend — Vercel
- Import repo to Vercel.
- Set `VITE_SOCKET_SERVER_URL` to your backend URL.
- Deploy.

2) Backend — Railway/Render
- Deploy the `/server` directory.
- Set `MONGO_URI` and `GEMINI_API_KEY`.

# Frontend (in another terminal)
cd ..
npm install
npm run build
serve -s dist # or use Vercel preview
```

If you'd like, I can:
- Auto-generate a `render.yaml` (already included) and a Vercel project config (already included),
- Create a `Dockerfile` and GitHub Actions CI workflow for builds + deploy, or
- Walk you through connecting the repo to Vercel and Render step-by-step.

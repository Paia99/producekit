# ProduceKit — Vercel Deployment Guide

## What's in this project

```
producekit-vercel/
├── api/
│   ├── distance.js           ← Google Maps Distance Matrix (traffic data)
│   ├── directions.js         ← Multi-stop routing with waypoint optimization
│   └── route-optimize.js     ← Full route optimizer (the main one)
├── src/
│   ├── main.jsx              ← React entry point
│   └── App.jsx               ← ProduceKit app (all 5 modules)
├── index.html                ← HTML shell
├── package.json              ← Dependencies (React + Vite)
├── vite.config.js            ← Vite bundler config
├── vercel.json               ← Vercel deployment config
├── .env.example              ← Environment variable template
├── .gitignore
└── SETUP.md                  ← This file
```

---

## Option A: Deploy via GitHub (Recommended)

### Step 1 — Push to GitHub

```bash
# Create a new repo on github.com, then:
cd producekit-vercel
git init
git add .
git commit -m "ProduceKit v0.3 — initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/producekit.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `producekit` repo
4. Vercel auto-detects Vite — leave all settings as default
5. Click **Deploy**

That's it — your app is live at `https://producekit-XXXX.vercel.app`

### Step 3 — Add Google Maps API Key

This step activates live route optimization with real traffic data.
Without it, the app works fine in demo mode with simulated drive times.

1. **Get a Google Maps API Key:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Create a new project (or use existing)
   - Go to **APIs & Services → Library**
   - Enable **Distance Matrix API**
   - Enable **Directions API**
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → API Key**
   - Copy the key

2. **Add to Vercel:**
   - Go to your Vercel project dashboard
   - Click **Settings → Environment Variables**
   - Add: `GOOGLE_MAPS_API_KEY` = `your_key_here`
   - Apply to: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**

3. **Redeploy:**
   - Go to **Deployments** tab
   - Click the **⋮** menu on the latest deployment
   - Click **Redeploy**

Now click ⚡ Optimize on any route and you'll get real Google Maps
drive times with live traffic data.

---

## Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project folder
cd producekit-vercel
vercel

# Follow the prompts:
#   Set up and deploy? Y
#   Which scope? (select your account)
#   Link to existing project? N
#   Project name? producekit
#   Directory? ./
#   Override settings? N

# Add your Google Maps API key
vercel env add GOOGLE_MAPS_API_KEY

# Redeploy to production
vercel --prod
```

---

## Local Development

```bash
cd producekit-vercel

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local and add your Google Maps API key

# Start dev server
npm run dev
```

The app runs at `http://localhost:5173`

> Note: API routes (`/api/*`) only work when deployed to Vercel.
> Locally the app automatically falls back to demo mode.
> To test API routes locally, use `vercel dev` instead of `npm run dev`.

---

## How the Google Maps Integration Works

When you click **⚡ Optimize** on a route in the Transport tab:

1. The app calls `/api/route-optimize` with pickup addresses + call time
2. The API sends the route to Google Maps Directions API with
   `optimize:true` to find the best stop order
3. Google returns leg-by-leg drive times including real-time traffic
4. The API works backward from call time to calculate each pickup time
5. Results flow back to the app with:
   - Optimized stop order
   - Pickup times with traffic
   - Per-leg traffic conditions (Clear / Light / Moderate / Heavy)
   - Total drive time & distance
   - Traffic delay vs. normal conditions
   - Google Maps link for the full route
6. These pickup times automatically appear on the Call Sheet

If the API is unavailable (no key, offline, etc.), the app falls back
to demo mode with realistic simulated data — no crashes, no errors.

---

## Google Maps API Costs

Estimate for a typical production:

| API Call | Per Route | Cost |
|---|---|---|
| Directions (with waypoints) | 1 call | $0.01 per call |
| Distance Matrix (if used) | 1 call | $0.005-0.01 |

A 20-day shoot with 4 routes/day = 80 calls ≈ **$0.80 total**

Google gives $200/month free credit, so you likely won't pay anything.

---

## Updating the App

After making changes:

```bash
git add .
git commit -m "your changes"
git push
```

Vercel auto-deploys on every push to `main`.

---

## Troubleshooting

**"Demo mode" even after adding API key?**
→ Redeploy after adding the env variable. Vercel needs a fresh deploy to pick up new env vars.

**"GOOGLE_MAPS_API_KEY not configured" error?**
→ Check the env variable name is exactly `GOOGLE_MAPS_API_KEY` (no typos, no quotes around the value).

**Google Maps returns "REQUEST_DENIED"?**
→ Make sure you enabled both **Distance Matrix API** and **Directions API** in Google Cloud Console.

**Routes show "No route found"?**
→ Check that addresses are valid and complete (include city + state).

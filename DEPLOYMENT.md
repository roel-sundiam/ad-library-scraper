# 🚀 Deployment Guide - Render

## Quick Deploy to Render

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Ad Library Scraper"
git branch -M main
git remote add origin https://github.com/yourusername/ad-library-scraper.git
git push -u origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration

### 3. Environment Variables
In Render dashboard, add these environment variables:
```
NODE_ENV=production
PORT=3000
DB_PATH=./data/ads.db
```

### 4. Test Your Deployment
Once deployed, test the API:
```bash
curl https://your-app.onrender.com/api/health

# Test Facebook scraping
curl -X POST https://your-app.onrender.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"platform": "facebook", "query": "Nike", "limit": 10, "region": "US"}'
```

## What This Deployment Includes

✅ **Real Facebook Ad Library Scraping** (production)
✅ **Mock data fallback** (development)
✅ **Job management system** with progress tracking
✅ **SQLite database** for storing results
✅ **RESTful API** with comprehensive endpoints
✅ **Error handling** and logging
✅ **Rate limiting** to respect Facebook's limits

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/scrape` - Start scraping job
- `GET /api/scrape/:jobId` - Get job status
- `GET /api/scrape/:jobId/results` - Get scraping results

## Production Features

- **Puppeteer** with Chrome in production environment
- **Automatic scaling** with Render
- **HTTPS** enabled by default
- **Error monitoring** through logs
- **24/7 uptime** monitoring

Your scraper will be live at: `https://your-app-name.onrender.com`
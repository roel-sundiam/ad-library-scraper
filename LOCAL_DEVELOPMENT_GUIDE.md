# Local Development Guide

This guide will help you set up and run the Ad Library Scraper with Competitor Analysis locally on your development machine.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Starting the Development Environment](#starting-the-development-environment)
- [Testing the Application](#testing-the-application)
- [Competitor Analysis Workflow](#competitor-analysis-workflow)
- [Troubleshooting](#troubleshooting)
- [Development Tips](#development-tips)

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to the project root
cd /path/to/scraper

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Configuration

Create your environment file:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` file with your API keys (optional for basic testing):

```env
# Facebook API (optional - will use mock data if not provided)
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# AI Analysis APIs (optional - will use mock analysis if not provided)
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key

# Database
DB_PATH=./data/ads.db

# Server Configuration
PORT=3000
NODE_ENV=development
```

> **Note**: The application works with mock data even without API keys, perfect for testing the interface and workflow.

## Starting the Development Environment

### Method 1: Two Terminal Setup (Recommended)

**Terminal 1 - Backend Server:**
```bash
# From project root
npm start
```

You should see:
```
info: Ad Library Scraper API running on port 3000
info: Environment: development
```

**Terminal 2 - Frontend Server:**
```bash
# From project root
cd frontend
npm start
```

You should see:
```
** Angular Live Development Server is listening on localhost:4200 **
✔ Compiled successfully
```

### Method 2: Background Process

```bash
# Start backend in background
npm start &

# Start frontend
cd frontend && npm start
```

## Testing the Application

### 1. Verify Backend Health

Open your browser or use curl:

```bash
# Browser: http://localhost:3000/api/health
# OR
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.1",
    "uptime": 123,
    "database": "memory",
    "timestamp": "2025-07-25T01:00:00.000Z"
  }
}
```

### 2. Access the Frontend

Navigate to: **http://localhost:4200**

The application should load with:
- ✅ Dashboard showing "API Status: healthy"
- ✅ Navigation sidebar with all menu items
- ✅ No connection errors

### 3. Test Basic Functionality

1. **Dashboard**: Should show connected API status
2. **Scraping**: Should allow you to create scraping jobs
3. **Analysis**: Should provide AI analysis options
4. **Competitor Analysis**: Should load the new competitor form

## Competitor Analysis Workflow

### Accessing the Feature

1. Navigate to **http://localhost:4200/competitor-analysis**
2. Or click **"Competitor Analysis"** in the sidebar

### Using the Workflow

1. **Fill out the form:**
   - **Your Facebook Page URL**: `https://facebook.com/nike`
   - **Competitor #1 URL**: `https://facebook.com/adidas`
   - **Competitor #2 URL**: `https://facebook.com/puma`

2. **Submit the analysis:**
   - Click "Start Competitor Analysis"
   - You'll be redirected to the progress dashboard

3. **Monitor progress:**
   - Real-time updates show workflow status
   - Progress bar indicates completion percentage
   - Individual page analysis status

4. **View results:**
   - Automatic redirect to results when complete
   - Comprehensive competitive analysis
   - Actionable insights and recommendations

### API Endpoints

The competitor analysis uses these endpoints:

```bash
# Start new analysis
POST http://localhost:3000/api/workflow/competitor-analysis
Content-Type: application/json
{
  "yourPageUrl": "https://facebook.com/nike",
  "competitor1Url": "https://facebook.com/adidas",
  "competitor2Url": "https://facebook.com/puma"
}

# Check workflow status
GET http://localhost:3000/api/workflow/{workflowId}/status

# Get results (when complete)
GET http://localhost:3000/api/workflow/{workflowId}/results
```

## Troubleshooting

### Backend Issues

**Server won't start:**
```bash
# Check for port conflicts
lsof -i :3000

# Try different port
PORT=3001 npm start
```

**API returning 404:**
```bash
# Verify endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/workflow/competitor-analysis
```

### Frontend Issues

**Angular server won't start:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

**API connection errors:**
1. Verify backend is running on port 3000
2. Check browser console for CORS errors
3. Ensure proxy configuration is working

**Proxy issues:**
Check `frontend/proxy.conf.json`:
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### Common Issues

**Port already in use:**
```bash
# Kill processes on port 3000
kill -9 $(lsof -t -i:3000)

# Kill processes on port 4200
kill -9 $(lsof -t -i:4200)
```

**Environment file not loading:**
```bash
# Verify .env file exists and has correct format
cat .env
```

**Mock data vs real data:**
- Without API keys: Uses mock/sample data
- With API keys: Uses real Facebook Ad Library API

## Development Tips

### Hot Reload

Both servers support hot reload:
- **Backend**: Restart required for changes
- **Frontend**: Automatic reload on file changes

### Debugging

**Backend logs:**
```bash
# Logs appear in terminal where npm start was run
# Look for info/error messages from Winston logger
```

**Frontend debugging:**
- Open browser developer tools (F12)
- Check Console tab for errors
- Network tab shows API requests

### Development Workflow

1. **Make backend changes**: Restart `npm start`
2. **Make frontend changes**: Auto-reload in browser
3. **Test API endpoints**: Use browser or curl
4. **Check logs**: Monitor both terminal windows

### Performance Tips

- **Backend**: Uses in-memory storage (fast but temporary)
- **Frontend**: Development build (not optimized)
- **Database**: SQLite auto-creates on first run

## Architecture Overview

```
Frontend (Angular)     Backend (Node.js/Express)
http://localhost:4200  http://localhost:3000

┌─────────────────┐    ┌──────────────────────┐
│                 │    │                      │
│ Angular App     │◄──►│ Express API Server   │
│ - Material UI   │    │ - REST endpoints     │
│ - Reactive Forms│    │ - Facebook API       │
│ - Real-time UI  │    │ - AI Analysis        │
│                 │    │ - SQLite DB          │
└─────────────────┘    └──────────────────────┘
```

## Next Steps

Once you have local development working:

1. **Configure API Keys**: Add real Facebook/AI API keys for production data
2. **Database Setup**: Configure persistent database instead of in-memory
3. **Deployment**: Use production builds for staging/production
4. **Monitoring**: Set up logging and monitoring for production use

---

## Quick Reference

### Start Development Environment
```bash
# Terminal 1 (Backend)
npm start

# Terminal 2 (Frontend)  
cd frontend && npm start
```

### Access Points
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **Competitor Analysis**: http://localhost:4200/competitor-analysis

### Stop Development Environment
```bash
# Press Ctrl+C in both terminals
# OR kill background processes:
kill -9 $(lsof -t -i:3000)  # Backend
kill -9 $(lsof -t -i:4200)  # Frontend
```

Happy coding! 🚀
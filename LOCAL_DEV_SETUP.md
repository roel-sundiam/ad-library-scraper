# 🚀 Local Development Setup Guide

## ✅ **Setup Complete!**
Your frontend has been configured to connect to your local backend at `localhost:3000`.

## 📋 **Configuration Changes Made**

### 1. **Frontend Environment Updated** ✅
```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: '/api', // Uses proxy to route to localhost:3000
  websocketUrl: 'ws://localhost:3000',
  enableDebugTools: true,
  logLevel: 'debug'
};
```

### 2. **Proxy Configuration** ✅ (Already configured)
```json
// frontend/proxy.conf.json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### 3. **Angular Configuration** ✅ (Already configured)
The `angular.json` is properly set up to use `proxy.conf.json` in development mode.

## 🏃 **How to Run Locally**

### **Step 1: Start the Backend** 
```bash
# In project root directory
npm start
```
- ✅ **Backend runs on**: http://localhost:3000
- ✅ **API endpoints**: http://localhost:3000/api/*
- ✅ **Your backend is already running!**

### **Step 2: Start the Frontend**
```bash
# In frontend directory
cd frontend
npm start
```
- ✅ **Frontend runs on**: http://localhost:4200
- ✅ **Proxy routes**: `/api/*` → `localhost:3000/api/*`

## 🔧 **Development Workflow**

### **Terminal 1: Backend** 
```bash
# Project root
npm start
# OR for development with auto-restart
npm run dev  
```

### **Terminal 2: Frontend**
```bash
# Frontend directory
cd frontend
npm start
```

## 🎯 **Testing Your Setup**

### **1. Backend Test**
```bash
curl http://localhost:3000/api/health
# Should return: {"success": true, "data": {...}}
```

### **2. Frontend Test**
1. Open: http://localhost:4200
2. Navigate to competitor analysis
3. Check browser dev tools - API calls should go to localhost:3000

### **3. Full System Test**
1. Go to: http://localhost:4200/competitor-analysis
2. Enter Facebook URLs:
   - Your page: `https://facebook.com/nike`
   - Competitor 1: `https://facebook.com/adidas`
   - Competitor 2: `https://facebook.com/puma`
3. Start analysis and watch real-time progress
4. View results dashboard with live Facebook ads data

## 📊 **What You'll See**

### **Backend Logs** (Terminal 1):
```
info: Ad Library Scraper API running on port 3000
info: Environment: development
info: Starting Playwright Facebook scraping for "nike"
info: HTTP scraping success: 3 ads found for "nike"
```

### **Frontend** (http://localhost:4200):
- ✅ System status indicators (Apify, Facebook API, HTTP, Playwright)
- ✅ Real-time progress tracking (30-60 seconds)
- ✅ Live Facebook ads dashboard
- ✅ Brand comparison charts
- ✅ Export functionality

## 🔍 **API Endpoints Available**

### **Core Endpoints**:
- `GET /api/health` - Health check
- `POST /api/start-analysis` - Start Facebook analysis
- `GET /api/status/{runId}` - Check analysis progress
- `GET /api/results/{runId}` - Get analysis results

### **Status Endpoints**:
- `GET /api/apify/status` - Apify scraper status
- `GET /api/facebook/status` - Facebook API status

## 🚨 **Troubleshooting**

### **Problem**: Frontend can't connect to backend
**Solution**: 
```bash
# Check if backend is running
ps aux | grep node
# Should show: node src/index.js

# Check if port 3000 is in use
netstat -tulpn | grep :3000
```

### **Problem**: CORS errors
**Solution**: The proxy configuration handles this automatically.

### **Problem**: API calls go to wrong URL
**Solution**: 
1. Restart frontend: `cd frontend && npm start`
2. Check browser dev tools → Network tab
3. API calls should show as `/api/*` (proxied)

### **Problem**: "Cannot GET /api/health"
**Solution**:
```bash
# Restart backend
cd /mnt/c/Projects2/scraper
npm start
```

## 📱 **Development URLs**

| Service | URL | Purpose |
|---------|-----|---------|
| **Backend API** | http://localhost:3000 | Express server |
| **Frontend** | http://localhost:4200 | Angular app |
| **Health Check** | http://localhost:3000/api/health | API status |
| **Competitor Analysis** | http://localhost:4200/competitor-analysis | Main feature |

## 🎉 **Your Local Development Environment**

✅ **Backend**: Express.js with Facebook Ads scraping (4-tier system)  
✅ **Frontend**: Angular with Material Design  
✅ **Proxy**: Routes frontend API calls to backend  
✅ **Hot Reload**: Both frontend and backend support auto-restart  
✅ **Real Data**: Live Facebook ads analysis  
✅ **Debug Tools**: Browser dev tools + backend logging  

## 🚀 **Ready to Develop!**

Your full-stack Facebook Ads analysis system is now running locally:

1. **Start Backend**: `npm start` (if not already running)
2. **Start Frontend**: `cd frontend && npm start`
3. **Open Browser**: http://localhost:4200
4. **Start Analyzing**: Enter Facebook page URLs and get live data!

Everything is configured and ready to go! 🎯
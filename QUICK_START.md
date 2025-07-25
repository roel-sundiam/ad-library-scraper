# Quick Start Guide

## 🚀 Start Development Environment

### 1. Start Backend
```bash
npm start
```
*Expected: "Ad Library Scraper API running on port 3000"*

### 2. Start Frontend  
```bash
cd frontend
npm start
```
*Expected: "Angular Live Development Server is listening on localhost:4200"*

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend App** | http://localhost:4200 | Main application interface |
| **API Health** | http://localhost:3000/api/health | Backend status check |
| **Competitor Analysis** | http://localhost:4200/competitor-analysis | New workflow feature |

## 🧪 Test Competitor Analysis

1. Navigate to: http://localhost:4200/competitor-analysis
2. Fill form with:
   - Your Page: `https://facebook.com/nike`
   - Competitor 1: `https://facebook.com/adidas`
   - Competitor 2: `https://facebook.com/puma`
3. Click "Start Competitor Analysis"
4. Monitor progress dashboard
5. View results when complete

## 🛠️ Quick Troubleshooting

### Backend won't start?
```bash
# Check port conflicts
lsof -i :3000
# Kill if needed
kill -9 $(lsof -t -i:3000)
```

### Frontend won't connect?
- Verify backend is running on port 3000
- Check browser console for errors
- Ensure http://localhost:3000/api/health returns healthy status

### Clear everything?
```bash
# Stop both servers (Ctrl+C)
# Kill any remaining processes
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:4200)
```

## 📝 Environment Setup (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys (optional for testing)
# - FACEBOOK_ACCESS_TOKEN
# - ANTHROPIC_API_KEY  
# - OPENAI_API_KEY
```

> **Note**: App works with mock data without API keys!

## 📋 Development Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 4200  
- [ ] Dashboard shows "API Status: healthy"
- [ ] Competitor Analysis form loads
- [ ] Can submit and track workflow
- [ ] Results display properly

---

**Need more help?** See [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md) for detailed instructions.
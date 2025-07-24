# 🚀 Start Your Angular Frontend

## Requirements
- **Node.js 20+** (Current version: 18.19.1 - needs upgrade)
- **npm 8+**

## Quick Start

### 1. Update Node.js (Required)
Your current Node.js version (18.19.1) is too old for Angular 17. Please upgrade:

**Windows:**
- Download from: https://nodejs.org/
- Install Node.js 20 LTS or 22 LTS

**Using Node Version Manager (recommended):**
```bash
# Install nvm if you don't have it
# Then install and use Node 20
nvm install 20
nvm use 20
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm start
# OR
ng serve
```

### 4. Open in Browser
Navigate to: **http://localhost:4200**

## What You'll See

✅ **Professional Dashboard** with:
- API health check and connection status
- Modern Material Design UI
- Responsive layout with sidebar navigation
- Quick action cards for scraping, analysis, and export

✅ **Navigation Menu** with:
- Dashboard (main overview)
- Scraping (placeholder - coming soon)
- Analysis (placeholder - coming soon) 
- Export (placeholder - coming soon)

## Backend Integration

The frontend is configured to connect to your Node.js API backend:
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000/api
- Auto-proxy configuration for seamless development

## Current Status

✅ **Ready Components:**
- Complete Angular 17 project structure
- Material Design + Tailwind CSS styling
- Professional dashboard with API integration
- Responsive layout and navigation
- Error handling and loading states

🚧 **Coming Next:**
- Scraping form interface
- Real-time job monitoring
- AI analysis dashboard with charts
- Data export functionality

## Troubleshooting

**1. Node.js Version Error**
```
The Angular CLI requires a minimum Node.js version of v20.19
```
**Solution:** Upgrade to Node.js 20+ as shown above

**2. Cannot Connect to API**
The dashboard will show a connection error if the backend isn't running.
**Solution:** Start your Node.js backend server on port 3000

**3. Port Already in Use**
```
Port 4200 is already in use
```
**Solution:** 
```bash
ng serve --port 4201
```

## Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build:prod

# Run tests
npm test

# Lint code
npm run lint
```

Your Angular frontend is now ready! 🎉

Once you upgrade Node.js and run `npm install && npm start`, you'll have a beautiful, professional interface for your Ad Library Scraper system.
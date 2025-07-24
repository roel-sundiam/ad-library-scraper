# 🚀 Quick Start - Windows PowerShell

## Run this directly in your Windows PowerShell (not WSL)

### 1. Navigate to Frontend Directory
```powershell
cd C:\Projects2\scraper\frontend
```

### 2. Install Angular CLI Globally
```powershell
npm install -g @angular/cli@17
```

### 3. Install Dependencies
```powershell
npm install
```

### 4. Start Development Server
```powershell
npm start
```

### 5. Open Browser
Navigate to: **http://localhost:4200**

## If You Get Errors:

### Error: "ng command not found"
```powershell
npm install -g @angular/cli@latest
```

### Error: "Permission denied" or "EACCES"
Run PowerShell as Administrator:
- Right-click PowerShell icon
- Select "Run as Administrator"
- Then run the commands above

### Error: "Cannot find module"
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Path "node_modules", "package-lock.json" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall
npm install
```

### Error: Node.js version (you have v23.5.0 which is fine)
The warning about odd Node.js versions is just a warning. v23.5.0 will work fine for development.

## What You'll See:
- **Professional dashboard** with Material Design
- **API health check** (will show error if backend not running)
- **Navigation sidebar** with Dashboard, Scraping, Analysis, Export
- **Responsive design** that works on all screen sizes

## Start Backend Too:
In another PowerShell window:
```powershell
cd C:\Projects2\scraper
npm install
npm start
```

This will start your Node.js API on port 3000, and the frontend will automatically connect to it.

## Success Indicators:
✅ Frontend loads at http://localhost:4200  
✅ Dashboard shows "API Status: healthy" (green)  
✅ Navigation works between pages  
✅ No console errors in browser

## Next Steps:
Once this basic setup works, we can add:
- Real scraping interface
- AI analysis dashboard
- Data visualization charts
- Export functionality

**Try running the commands above in Windows PowerShell directly - this should work better than WSL for Angular development on Windows!** 🚀
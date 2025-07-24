# 🚀 Complete Deployment Guide - GitHub CLI Method

## Prerequisites
- GitHub CLI installed (`gh --version` to check)
- Git initialized in your project (`git init` already done)
- All files committed (`git add . && git commit -m "Initial commit"` already done)

## Step 1: Authenticate with GitHub CLI

```bash
gh auth login
```

**Follow these prompts:**

1. **Where do you use GitHub?**
   ```
   ? Where do you use GitHub? GitHub.com
   ```
   → Select **GitHub.com** (press Enter)

2. **Preferred protocol:**
   ```
   ? What is your preferred protocol for Git operations on this host?
   > HTTPS
     SSH
   ```
   → Select **HTTPS** (press Enter)

3. **Authenticate Git:**
   ```
   ? Authenticate Git with your GitHub credentials? (Y/n)
   ```
   → Type **Y** and press Enter

4. **Authentication method:**
   ```
   ? How would you like to authenticate GitHub CLI?
   > Login with a web browser
     Paste an authentication token
   ```
   → Select **Login with a web browser** (press Enter)

5. **One-time code:**
   ```
   ! First copy your one-time code: ABCD-1234
   Press Enter to open github.com in your browser...
   ```
   → **Copy the code** (e.g., ABCD-1234)
   → Press **Enter**

6. **Browser authentication:**
   - Your browser will open to GitHub
   - **Paste the one-time code** you copied
   - Click **"Continue"**
   - Click **"Authorize GitHub CLI"**
   - You'll see "Congratulations, you're all set!"

7. **Confirmation in terminal:**
   ```
   ✓ Authentication complete.
   ✓ Logged in as roel-sundiam
   ```

## Step 2: Create Repository and Push

Run this single command:
```bash
gh repo create ad-library-scraper --public --source=. --remote=origin --push
```

**What this does:**
- ✅ Creates `ad-library-scraper` repository on GitHub
- ✅ Makes it public (required for free Render deployment)
- ✅ Sets it as your `origin` remote
- ✅ Pushes all your code to GitHub automatically

**Expected output:**
```
✓ Created repository roel-sundiam/ad-library-scraper on GitHub
✓ Added remote https://github.com/roel-sundiam/ad-library-scraper.git
✓ Pushed commits to https://github.com/roel-sundiam/ad-library-scraper.git
```

## Step 3: Deploy to Render

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** (you can use your GitHub account)
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub account** if not already connected
5. **Find and select** `roel-sundiam/ad-library-scraper`
6. **Render auto-detects configuration** from `render.yaml`
7. **Review settings:**
   - **Name:** ad-library-scraper
   - **Branch:** main
   - **Build Command:** npm install
   - **Start Command:** npm start
8. **Click "Create Web Service"**

## Step 4: Monitor Deployment

**Render will:**
- ✅ Clone your repository
- ✅ Install dependencies (`npm install`)
- ✅ Install Chrome for Puppeteer
- ✅ Start your server (`npm start`)
- ✅ Provide a live URL (e.g., `https://ad-library-scraper.onrender.com`)

**Deployment takes ~3-5 minutes**

## Step 5: Test Your Live API

Once deployed, test these endpoints:

### Health Check:
```bash
curl https://your-app.onrender.com/api/health
```

### Start Facebook Scraping:
```bash
curl -X POST https://your-app.onrender.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"platform": "facebook", "query": "Nike", "limit": 10, "region": "US"}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "job_id": "scrape_1234567890_abcdef",
    "status": "queued",
    "platform": "facebook",
    "query": "Nike",
    "limit": 10,
    "estimated_duration": "2-5 minutes"
  }
}
```

### Check Job Status:
```bash
curl https://your-app.onrender.com/api/scrape/JOB_ID_FROM_ABOVE
```

### Get Results:
```bash
curl https://your-app.onrender.com/api/scrape/JOB_ID_FROM_ABOVE/results
```

## Step 6: Verify Real Facebook Scraping

In production, your app will:
- ✅ **Use real Puppeteer** with Chrome
- ✅ **Scrape facebook.com/ads/library** directly
- ✅ **Extract real competitor ad data**
- ✅ **Return actual Facebook ads** for analysis

## Troubleshooting

### If GitHub CLI authentication fails:
```bash
gh auth logout
gh auth login
```

### If repository creation fails:
```bash
# Try a different name
gh repo create facebook-ad-scraper --public --source=. --remote=origin --push
```

### If Render deployment fails:
- Check the **Render logs** in your dashboard
- Ensure your repository is **public**
- Verify `render.yaml` exists in your root directory

## Success! 🎉

Your **Facebook Ad Library Scraper** is now live and can:
- ✅ Scrape competitor ads from Facebook Ad Library
- ✅ Track scraping jobs with real-time progress
- ✅ Return structured ad data for analysis
- ✅ Handle multiple concurrent scraping requests
- ✅ Store results in SQLite database

**Your API is ready for integration with frontend applications and AI analysis tools!**

---

**Live URL:** `https://your-app.onrender.com`
**GitHub Repository:** `https://github.com/roel-sundiam/ad-library-scraper`
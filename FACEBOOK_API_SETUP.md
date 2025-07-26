# Facebook Ad Library API Setup Guide

This guide will help you set up the Facebook Ad Library API for real competitor analysis data collection.

## Prerequisites

1. **Facebook Account**: You need a personal Facebook account
2. **Meta for Developers Account**: Create at [developers.facebook.com](https://developers.facebook.com)
3. **Identity Verification**: Complete Facebook's identity verification process

## Step-by-Step Setup

### 1. Create Meta for Developers Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "Get Started" 
3. Use your Facebook account to log in
4. Complete the developer account setup

### 2. Create a New App

1. In the Meta for Developers dashboard, click "My Apps"
2. Click "Create App"
3. Select "Business" as the app type
4. Fill in app details:
   - **App Name**: Your scraper app name (e.g., "Ad Library Scraper")
   - **App Contact Email**: Your email address
   - **Business Manager Account**: Optional

### 3. Get App Credentials

After creating the app:
1. Go to **App Settings > Basic**
2. Copy the **App ID** and **App Secret**
3. These will be used in your environment variables

### 4. Generate Access Token

#### Option A: Graph API Explorer (Quick Test)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from the dropdown
3. Click "Generate Access Token"
4. Grant necessary permissions
5. Copy the generated token

#### Option B: Long-lived Token (Production)
1. Use the Facebook Graph API to exchange short-lived tokens for long-lived ones
2. Long-lived tokens last 60 days and can be refreshed

### 5. Configure Environment Variables

Create/update your `.env` file:

```env
# Facebook Ad Library API
FACEBOOK_ACCESS_TOKEN=your_access_token_here
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

### 6. Test the Integration

Run the test script to verify everything works:

```bash
node src/scripts/test-facebook-api.js
```

## What We've Implemented

✅ **Facebook API Client** (`src/scrapers/facebook-api-client.js`)  
✅ **Updated API Routes** with automatic fallback (API → Scraper → Mock)  
✅ **Environment Configuration** for API credentials  
✅ **Test Script** to verify API integration  
✅ **Status Endpoint** (`GET /api/facebook/status`) to check API health  

## Quick Test

After setting up your access token, you can test the integration:

```bash
# 1. Set your access token in .env file
echo "FACEBOOK_ACCESS_TOKEN=your_token_here" >> .env

# 2. Run the test script
node src/scripts/test-facebook-api.js

# 3. Check API status via HTTP
curl http://localhost:3000/api/facebook/status

# 4. Test a search request
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"platform":"facebook","query":"nike","limit":5,"region":"US"}'
```

## Resources

- [Facebook Ad Library API Documentation](https://developers.facebook.com/docs/graph-api/reference/ads_archive/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Facebook for Developers](https://developers.facebook.com/)
- [Ad Library Website](https://www.facebook.com/ads/library/)
# 🔧 Facebook Ad Library API Setup Guide

## Step 1: Create Facebook App

### 1.1 Go to Facebook Developers
Visit: **https://developers.facebook.com/**

### 1.2 Create New App
1. Click **"Create App"**
2. Select **"Business"** as app type
3. Fill out app details:
   - **App Name**: "Ad Library Scraper"
   - **App Contact Email**: Your email
   - **Business Manager Account**: Create or select one

### 1.3 Add Products
1. Go to **App Dashboard**
2. Click **"Add Product"**
3. Add **"Marketing API"** (this gives access to Ad Library)

## Step 2: Get Access Token

### 2.1 Generate Token
1. Go to **Tools > Graph API Explorer**
2. Select your app from dropdown
3. Click **"Generate Access Token"**
4. Select these permissions:
   - `ads_read`
   - `business_management`
   - `read_insights`

### 2.2 Get Long-lived Token
Your token expires in 1 hour by default. Get a long-lived token:

```bash
curl -X GET "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id={your-app-id}&client_secret={your-app-secret}&fb_exchange_token={short-lived-token}"
```

### 2.3 Test Your Token
Test access to Ad Library:
```bash
curl "https://graph.facebook.com/v18.0/ads_archive?access_token={your-token}&ad_reached_countries=US&search_terms=fitness&fields=id,ad_creative_bodies,page_name&limit=5"
```

## Step 3: Configure Environment

Add to your `.env` file:
```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_ACCESS_TOKEN=your_long_lived_token_here
```

## Important Notes:

### ⚠️ Facebook API Limitations:
- **Rate Limits**: 200 calls per hour per app by default
- **Data Access**: Only publicly available ad library data
- **Approval**: Some uses may require Facebook review
- **Geographic**: Can filter by countries, but not all regions available

### 🔒 Security:
- **Never commit tokens** to git repositories
- **Use environment variables** for all credentials
- **Rotate tokens** regularly
- **Monitor usage** to avoid rate limits

### 📊 Available Data Fields:
- `id` - Unique ad identifier
- `ad_creative_bodies` - Ad text content
- `ad_creative_link_captions` - Link previews
- `ad_creative_link_descriptions` - Link descriptions
- `ad_creative_link_titles` - Link titles
- `ad_delivery_start_time` - When ad started running
- `ad_delivery_stop_time` - When ad stopped
- `ad_snapshot_url` - Visual preview of ad
- `currency` - Spend currency
- `demographic_distribution` - Age/gender breakdown
- `impressions` - Impression ranges
- `page_id` - Advertiser page ID
- `page_name` - Advertiser page name
- `publisher_platforms` - Where ad appeared (Facebook, Instagram, etc.)
- `spend` - Spend ranges

## Next Steps:
1. Create Facebook App and get credentials
2. Test API access with curl
3. Add credentials to `.env` file
4. We'll integrate this into your scraper backend

**This will give you access to millions of real Facebook ads!** 🚀
# 🕷️ Scraping Guide - Understanding Each Field

## Form Fields Explained:

### **1. Platform Selection**
- **Facebook/Meta**: Access to Facebook Ad Library (most comprehensive data)
- **Google Ads**: Google Ads Transparency Center data
- **TikTok**: TikTok Ad Library (coming soon)
- **LinkedIn**: LinkedIn Ad Library (coming soon)

### **2. Search Query**
**What it does**: Keywords to search for in ad content
**Examples**:
- `"fitness supplements"` - Find ads about fitness products
- `"real estate"` - Property and real estate ads
- `"coffee shop"` - Local business ads
- `"SaaS software"` - B2B software ads

### **3. Limit**
**What it does**: Maximum number of ads to scrape
**Recommendations**:
- **Testing**: 10-50 ads
- **Small project**: 100-500 ads
- **Large analysis**: 1000+ ads

### **4. Region**
**What it does**: Geographic targeting for ads
**Options**:
- **US**: United States ads only
- **GB**: United Kingdom
- **ALL**: Global ads (most data, but slower)

### **5. Date Range**
**What it does**: How far back to look for ads
**Options**:
- **7 days**: Recent ads only (fastest)
- **30 days**: Good balance of data and speed
- **90 days**: Comprehensive historical data
- **All time**: Everything available (slowest)

### **6. Advanced Filters**
**Ad Type**:
- **All Types**: Images, videos, carousels
- **Image**: Static image ads only
- **Video**: Video ads only
- **Carousel**: Multi-image swipeable ads

**Minimum Impressions**:
- Filter out low-performing ads
- Example: `10000` = only ads with 10k+ impressions

## What Happens When You Submit:

### **Frontend Process**:
1. Form validation runs
2. Data is sent to `/api/scrape` endpoint
3. Unique job ID is generated
4. Job status appears in right panel

### **Backend Process** (Current - Mock):
1. Receives your search parameters
2. Validates required fields
3. Generates unique job ID
4. Returns success response with job details

### **Real Scraping Process** (Future):
1. Connects to platform APIs (Facebook Ad Library, etc.)
2. Searches using your keywords
3. Extracts ad data (creative, targeting, metrics)
4. Stores results in database
5. Provides real-time progress updates

## Data You'll Get:

### **Ad Information**:
- **Creative Content**: Ad text, headlines, descriptions
- **Visual Assets**: Image/video URLs
- **Call-to-Actions**: "Shop Now", "Learn More", etc.

### **Advertiser Details**:
- Company/page name
- Verification status
- Industry category

### **Performance Metrics**:
- Impression ranges (10k-50k)
- Estimated spend ranges ($100-$500)
- Currency and region data

### **Targeting Information**:
- Age groups (25-45)
- Gender targeting
- Geographic regions
- Interest categories

This data is perfect for:
- **Competitive analysis**
- **Market research**
- **Creative inspiration**
- **Industry trends**
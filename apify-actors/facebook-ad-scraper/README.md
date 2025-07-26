# Custom Facebook Ad Library Scraper

A robust Facebook Ad Library scraper built with Puppeteer Extra and stealth plugins to avoid detection.

## Features

- **Stealth Mode**: Uses puppeteer-extra-plugin-stealth to avoid bot detection
- **Real Ad Data**: Scrapes live Facebook Ad Library data
- **Flexible Search**: Search by advertiser name or keywords
- **Auto-scrolling**: Automatically loads more ads by scrolling
- **Data Extraction**: Extracts advertiser, content, images, CTA, dates, and more

## Deployment to Apify

### Method 1: Apify CLI (Recommended)

1. Install Apify CLI:
```bash
npm install -g @apify/cli
```

2. Login to Apify:
```bash
apify login
```

3. Navigate to actor directory:
```bash
cd apify-actors/facebook-ad-scraper
```

4. Deploy the actor:
```bash
apify push
```

### Method 2: Manual Upload

1. Zip the entire `facebook-ad-scraper` folder
2. Go to [Apify Console](https://console.apify.com)
3. Create new Actor
4. Upload the zip file
5. Set build to use Node.js 18+

## Usage

### Input Parameters

```json
{
  "query": "nike",
  "limit": 20,
  "country": "US",
  "adType": "all",
  "searchType": "advertiser"
}
```

### Output Format

```json
[
  {
    "advertiser": "Nike",
    "content": "Just Do It - New Collection",
    "images": ["https://..."],
    "callToAction": "Shop Now",
    "startDate": "December 1, 2024",
    "disclaimer": "Paid for by Nike Inc.",
    "adSnapshotUrl": "https://facebook.com/ads/library/...",
    "scrapedAt": "2024-12-25T10:30:00.000Z"
  }
]
```

## Integration with Backend

Update your Apify scraper to use this custom actor:

```javascript
// In src/scrapers/apify-scraper.js
this.scrapers = [
  'your-username/facebook-ad-library-scraper' // Your custom actor
];
```

## Notes

- Uses residential proxies through Apify's proxy service
- Respects Facebook's rate limits
- Handles CAPTCHA and login prompts gracefully
- Extracts comprehensive ad metadata
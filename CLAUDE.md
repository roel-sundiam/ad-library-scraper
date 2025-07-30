# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend Development
- `npm start` - Start production server on port 3000
- `npm run dev` - Start development server with nodemon
- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint on src/ directory
- `npm run build` - Run webpack production build

### Frontend Development (Angular)
- `cd frontend && npm start` - Start Angular dev server with proxy
- `cd frontend && ng build` - Build for development
- `cd frontend && ng build --configuration production` - Production build
- `cd frontend && ng test` - Run Angular tests with Karma/Jasmine

### Environment Setup
- Copy `.env.example` to `.env` and configure API keys
- Database will auto-initialize on first run (MongoDB)

## Architecture

### Backend Structure
This is an Express.js API server for ad library scraping and analysis:

- **Entry Point**: `src/index.js` - Express server with middleware setup
- **API Routes**: `src/api/routes.js` - RESTful endpoints for scraping, analysis, export
- **Database**: `src/database/mongodb.js` - MongoDB connection and model initialization
- **Scrapers**: `src/scrapers/facebook-scraper.js` - Facebook Ad Library API integration with rate limiting
- **Utilities**: `src/utils/` - Logger (Winston) and rate limiter components

### Frontend Structure  
Angular 17 SPA with feature modules:

- **Core**: Authentication, guards, interceptors, API service
- **Features**: Dashboard, scraping, analysis, export modules
- **Layout**: Header, sidebar, main layout components
- **Shared**: Reusable components, models, pipes

### Key Patterns

**Database Schema**: 
- User collection with authentication and role data
- SiteAnalytics collection for page visits and user actions
- UserActivityLog collection for activity tracking
- Additional collections for ads, advertisers, and scraping sessions

**API Response Format**:
```javascript
{
  success: boolean,
  data: {...},
  error?: { code, message, details }
}
```

**Rate Limiting**: Facebook API limited to 180 requests/hour with automatic backoff

**Important**: NO MOCK DATA - System returns real data only or fails gracefully. Sample/mock data generation has been removed per user requirements.

## Video Transcription Export

### Video Transcript Fields
Video transcription data is stored in `ad.creative.video_transcripts` and exported in the `video_transcripts` section:

**Key Fields:**
- `transcript_text`: The actual spoken content from the video
- `video_url`: Direct URL to the video file
- `duration`: Video length in seconds
- `model`: AI model used (typically "whisper-1")
- `success`: Whether transcription was successful
- `confidence`: Transcription confidence score (0-1)
- `language`: Detected language code
- `processing_time_ms`: Time taken to process transcription

### Export JSON Structure
```json
{
  "analysis_summary": {...},
  "brand_comparisons": [...],
  "recent_ads": [...],
  "video_transcripts": {
    "total_videos_found": 25,
    "videos_processed": 15,
    "processing_limit": 15,
    "transcription_enabled": true,
    "transcripts": [
      {
        "ad_id": "123456789",
        "advertiser": "Nike",
        "video_url": "https://example.com/video.mp4",
        "transcript_text": "Just do it. Our new running shoes...",
        "duration": 30,
        "model": "whisper-1",
        "success": true,
        "confidence": 0.95,
        "language": "en",
        "processing_time_ms": 1500
      }
    ]
  },
  "raw_data": {...}
}
```

### Current Testing Configuration
- Video transcription limited to 15 videos per analysis
- Location: `src/api/routes.js:4052`
- Export filename: `facebook-ads-analysis-dataset_{id}_with-transcripts.json`

### Production Scaling Instructions
To remove 15-video limit for production:

1. **Single Line Change Required:**
   File: `src/api/routes.js:4052`
   ```javascript
   // CHANGE FROM:
   const maxVideos = Math.min(job.videos.length, 15);
   
   // CHANGE TO:
   const maxVideos = job.videos.length;
   ```

2. **Update Cost Warnings:**
   File: `facebook-ads-dashboard.component.ts:744-747`
   - Update cost calculation from fixed to dynamic
   - Change UI message from "~$0.15 for 15 videos" to actual count

**Environment Variables**:
- `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - Facebook API
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` - AI analysis models
- `MONGODB_URI` - MongoDB connection string
- `PORT`, `NODE_ENV` - Server configuration

### Key Files to Understand

- `src/api/routes.js:20-78` - Scraping job creation logic
- `src/scrapers/facebook-scraper.js:52-108` - Main scraping algorithm
- `src/database/mongodb.js:92-109` - Database initialization and model registration
- `frontend/src/app/core/services/api.service.ts` - Frontend API integration

### Development Notes

- Backend uses CommonJS modules (require/module.exports)
- Frontend uses TypeScript with Angular 17
- Database auto-creates collections and indexes on first run
- **CRITICAL: NO MOCK DATA ALLOWED** - User requires real Facebook ads data only
- Facebook scraper handles rate limiting and pagination automatically
- Proxy configuration in `frontend/proxy.conf.json` routes /api to backend
- Apify integration must return actual Facebook Ad Library data
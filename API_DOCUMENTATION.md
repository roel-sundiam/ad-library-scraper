# API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints require authentication via API key in the header:

```bash
Authorization: Bearer YOUR_API_KEY
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per API key
- **Headers**: Rate limit info included in response headers
- **429 Response**: When limit exceeded, includes `Retry-After` header

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "uuid-here"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "uuid-here"
  }
}
```

## Endpoints

### Health Check

#### GET /health
Check API server status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600,
    "database": "connected"
  }
}
```

---

## Scraping Endpoints

### Start Scraping Job

#### POST /scrape
Initiate a scraping job for a specific platform.

**Request Body:**
```json
{
  "platform": "facebook",           // Required: facebook, google, tiktok, linkedin
  "query": "fitness supplements",    // Optional: search query
  "advertiser": "page-id-123",      // Optional: specific advertiser
  "limit": 100,                     // Optional: max ads to scrape (default: 50)
  "region": "US",                   // Optional: geographic region
  "date_range": "30_days",          // Optional: 7_days, 30_days, 90_days
  "filters": {                      // Optional: additional filters
    "ad_type": "image",
    "min_impressions": 1000,
    "languages": ["en"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "scrape_abc123",
    "status": "queued",
    "estimated_duration": "5-10 minutes",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Get Scraping Job Status

#### GET /scrape/{job_id}
Check the status of a scraping job.

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "scrape_abc123",
    "status": "running",              // queued, running, completed, failed
    "progress": {
      "current": 45,
      "total": 100,
      "percentage": 45
    },
    "results": {
      "ads_found": 45,
      "ads_processed": 45,
      "errors": 0
    },
    "started_at": "2024-01-01T00:05:00Z",
    "estimated_completion": "2024-01-01T00:15:00Z"
  }
}
```

### Get Scraped Ads

#### GET /scrape/{job_id}/results
Retrieve scraped ad data from a completed job.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 200)
- `format`: Response format (json, csv) (default: json)

**Response:**
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "ad_id": "123456789",
        "platform": "facebook",
        "advertiser": {
          "page_id": "page123",
          "page_name": "Example Company",
          "verified": true
        },
        "creative": {
          "body": "Get fit with our supplements!",
          "title": "Premium Fitness Supplements",
          "description": "Transform your workout routine",
          "call_to_action": "Shop Now",
          "image_url": "https://example.com/ad-image.jpg",
          "video_url": null
        },
        "targeting": {
          "age_range": "25-45",
          "gender": "all",
          "locations": ["United States"],
          "interests": ["fitness", "supplements"]
        },
        "metrics": {
          "impressions_min": 10000,
          "impressions_max": 50000,
          "spend_min": 500,
          "spend_max": 2000,
          "currency": "USD"
        },
        "dates": {
          "created": "2024-01-01T00:00:00Z",
          "first_seen": "2024-01-01T00:00:00Z",
          "last_seen": "2024-01-15T00:00:00Z"
        },
        "scraped_at": "2024-01-16T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

---

## Analysis Endpoints

### Analyze Ads

#### POST /analyze
Analyze scraped ads using AI models.

**Request Body:**
```json
{
  "ad_ids": ["123", "456", "789"],           // Required: Array of ad IDs
  "model": "claude-4-sonnet",                // Required: AI model to use
  "analysis_type": "competitive_intelligence", // Required: Analysis type
  "options": {                               // Optional: Analysis options
    "include_images": true,
    "competitor_comparison": true,
    "trend_analysis": true
  }
}
```

**Available Models:**
- `claude-4-sonnet`: Fast, efficient analysis
- `claude-4-opus`: Deep, comprehensive insights  
- `chatgpt-4o`: Creative and trend analysis

**Analysis Types:**
- `creative_analysis`: Analyze ad copy, hooks, CTAs
- `competitive_intelligence`: Compare with competitors
- `trend_analysis`: Identify market trends
- `performance_prediction`: Predict ad performance
- `audience_insights`: Analyze targeting and demographics

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis_xyz789",
    "status": "queued",
    "model": "claude-4-sonnet",
    "analysis_type": "competitive_intelligence",
    "estimated_duration": "2-5 minutes",
    "cost_estimate": "$0.25"
  }
}
```

### Get Analysis Results

#### GET /analyze/{analysis_id}
Retrieve AI analysis results.

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "analysis_xyz789",
    "status": "completed",
    "model": "claude-4-sonnet",
    "analysis_type": "competitive_intelligence",
    "results": {
      "summary": {
        "total_ads_analyzed": 3,
        "confidence_score": 0.92,
        "key_insights": [
          "Strong emotional hooks in 85% of ads",
          "Price-focused CTAs outperform feature-focused by 40%",
          "Video content shows 3x higher engagement"
        ]
      },
      "ad_analyses": [
        {
          "ad_id": "123",
          "creative_analysis": {
            "hook_strength": 8.5,
            "emotional_triggers": ["urgency", "social_proof"],
            "cta_effectiveness": 7.2,
            "visual_appeal": 9.1
          },
          "competitive_position": {
            "uniqueness_score": 6.8,
            "market_saturation": "medium",
            "differentiation_factors": ["price", "quality"]
          },
          "performance_prediction": {
            "success_probability": 0.78,
            "estimated_ctr": "2.1-3.4%",
            "optimization_suggestions": [
              "Test shorter ad copy",
              "A/B test CTA buttons"
            ]
          }
        }
      ],
      "market_insights": {
        "trending_themes": ["sustainability", "convenience"],
        "successful_formats": ["carousel", "video"],
        "price_positioning": {
          "average_range": "$29-89",
          "competitive_analysis": "Your pricing is 15% below market average"
        }
      }
    },
    "cost": "$0.23",
    "processing_time": "3.2 seconds",
    "completed_at": "2024-01-01T01:05:00Z"
  }
}
```

### Batch Analysis

#### POST /analyze/batch
Analyze multiple ad sets with different configurations.

**Request Body:**
```json
{
  "analyses": [
    {
      "name": "competitor_analysis",
      "ad_ids": ["123", "456"],
      "model": "claude-4-opus",
      "analysis_type": "competitive_intelligence"
    },
    {
      "name": "creative_review",
      "ad_ids": ["789", "101"],
      "model": "chatgpt-4o",
      "analysis_type": "creative_analysis"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batch_id": "batch_def456",
    "analyses": [
      {
        "name": "competitor_analysis",
        "analysis_id": "analysis_1",
        "status": "queued"
      },
      {
        "name": "creative_review",
        "analysis_id": "analysis_2",
        "status": "queued"
      }
    ],
    "total_cost_estimate": "$0.45"
  }
}
```

---

## Export Endpoints

### Export Data

#### GET /export
Export scraped or analyzed data in various formats.

**Query Parameters:**
- `type`: Data type (ads, analysis, advertisers)
- `format`: Export format (json, csv, excel)
- `job_id`: Scraping job ID (for ads export)
- `analysis_id`: Analysis ID (for analysis export)
- `date_from`: Start date (YYYY-MM-DD)
- `date_to`: End date (YYYY-MM-DD)
- `filters`: JSON string with filters

**Example:**
```bash
GET /export?type=ads&format=csv&job_id=scrape_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "export_ghi789",
    "download_url": "https://example.com/exports/export_ghi789.csv",
    "expires_at": "2024-01-02T00:00:00Z",
    "file_size": "2.5MB",
    "record_count": 1500
  }
}
```

### Export Status

#### GET /export/{export_id}
Check export generation status.

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "export_ghi789",
    "status": "completed",
    "download_url": "https://example.com/exports/export_ghi789.csv",
    "file_size": "2.5MB",
    "expires_at": "2024-01-02T00:00:00Z"
  }
}
```

---

## Management Endpoints

### List AI Models

#### GET /models
Get available AI models and their capabilities.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "claude-4-sonnet",
        "name": "Claude 4 Sonnet",
        "provider": "anthropic",
        "capabilities": ["creative_analysis", "competitive_intelligence"],
        "cost_per_1k_tokens": 0.003,
        "max_tokens": 200000,
        "speed": "fast",
        "accuracy": "high"
      },
      {
        "id": "claude-4-opus",
        "name": "Claude 4 Opus",
        "provider": "anthropic",
        "capabilities": ["all"],
        "cost_per_1k_tokens": 0.015,
        "max_tokens": 200000,
        "speed": "medium",
        "accuracy": "highest"
      },
      {
        "id": "chatgpt-4o",
        "name": "ChatGPT-4o",
        "provider": "openai",
        "capabilities": ["creative_analysis", "trend_analysis"],
        "cost_per_1k_tokens": 0.005,
        "max_tokens": 128000,
        "speed": "fast",
        "accuracy": "high"
      }
    ]
  }
}
```

### Usage Statistics

#### GET /usage
Get API usage statistics for your account.

**Query Parameters:**
- `period`: Time period (day, week, month) (default: month)
- `date_from`: Start date (YYYY-MM-DD)
- `date_to`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "scraping": {
      "total_jobs": 45,
      "total_ads_scraped": 12500,
      "success_rate": 0.96,
      "platforms": {
        "facebook": 8000,
        "google": 3000,
        "tiktok": 1000,
        "linkedin": 500
      }
    },
    "analysis": {
      "total_analyses": 25,
      "total_cost": "$45.67",
      "models_used": {
        "claude-4-sonnet": 15,
        "claude-4-opus": 7,
        "chatgpt-4o": 3
      }
    },
    "exports": {
      "total_exports": 12,
      "formats": {
        "csv": 8,
        "json": 3,
        "excel": 1
      }
    }
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `INVALID_API_KEY` | Invalid or missing API key | Authentication failed |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Too many requests |
| `INVALID_PLATFORM` | Unsupported platform | Platform not supported |
| `INVALID_MODEL` | AI model not available | Model ID not recognized |
| `INSUFFICIENT_CREDITS` | Insufficient API credits | Account credit limit reached |
| `JOB_NOT_FOUND` | Job not found | Invalid job ID |
| `SCRAPING_FAILED` | Scraping job failed | Platform error or blocking |
| `ANALYSIS_FAILED` | Analysis failed | AI model error |
| `EXPORT_FAILED` | Export generation failed | Data processing error |
| `VALIDATION_ERROR` | Request validation failed | Invalid request parameters |

---

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install ad-library-scraper-sdk
```

```javascript
const AdLibraryScraper = require('ad-library-scraper-sdk');

const client = new AdLibraryScraper({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.example.com'
});

// Scrape ads
const job = await client.scrape({
  platform: 'facebook',
  query: 'fitness supplements',
  limit: 100
});

// Analyze results
const analysis = await client.analyze({
  ad_ids: job.ad_ids,
  model: 'claude-4-sonnet',
  analysis_type: 'competitive_intelligence'
});
```

### Python
```bash
pip install ad-library-scraper
```

```python
from ad_library_scraper import Client

client = Client(api_key='your-api-key')

# Scrape ads
job = client.scrape(
    platform='facebook',
    query='fitness supplements',
    limit=100
)

# Analyze results
analysis = client.analyze(
    ad_ids=job['ad_ids'],
    model='claude-4-sonnet',
    analysis_type='competitive_intelligence'
)
```

---

## Webhooks

Configure webhooks to receive real-time notifications about job completions.

### Webhook Events
- `scraping.completed`: Scraping job finished
- `scraping.failed`: Scraping job failed
- `analysis.completed`: Analysis finished
- `analysis.failed`: Analysis failed
- `export.ready`: Export file ready for download

### Webhook Payload
```json
{
  "event": "scraping.completed",
  "job_id": "scrape_abc123",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "ads_found": 150,
    "success_rate": 0.98,
    "duration": "8 minutes"
  }
}
```

Configure webhooks in your account settings or via API:

```bash
POST /webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["scraping.completed", "analysis.completed"],
  "secret": "your-webhook-secret"
}
```
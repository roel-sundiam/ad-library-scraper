# System Architecture

## Overview

The Ad Library Scraper + Multi-Model AI Analysis API is built as a modular, scalable system that separates concerns between data collection, processing, analysis, and API delivery.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Mobile App    │    │  Third-party    │
│                 │    │                 │    │  Integration    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer        │
                    │      (Nginx/HAProxy)      │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │       API Gateway         │
                    │   (Express.js + Helmet)   │
                    │  • Authentication         │
                    │  • Rate Limiting          │
                    │  • Request Validation     │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│  Scraper Service  │  │ Analysis Service  │  │  Export Service   │
│                   │  │                   │  │                   │
│ • Platform APIs   │  │ • AI Model APIs   │  │ • Format Convert  │
│ • Web Scraping    │  │ • Data Processing │  │ • File Generation │
│ • Anti-Detection  │  │ • Prompt Templates│  │ • Storage         │
└─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Message Queue        │
                    │       (Redis/Bull)        │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Database Layer       │
                    │   • SQLite (Dev)          │
                    │   • PostgreSQL (Prod)     │
                    │   • Redis (Cache)         │
                    └───────────────────────────┘
```

## Core Components

### 1. API Gateway Layer

**Technology**: Express.js with middleware stack
**Responsibilities**:
- Request routing and validation
- Authentication and authorization
- Rate limiting and DDoS protection  
- Request/response logging
- Error handling and response formatting

```javascript
// Example middleware stack
app.use(helmet());           // Security headers
app.use(cors());            // Cross-origin requests
app.use(rateLimiter);       // Rate limiting
app.use(authenticator);     // API key validation
app.use('/api', routes);    // Route handling
```

### 2. Scraper Service

**Technology**: Node.js with Puppeteer, Axios, Cheerio
**Responsibilities**:
- Multi-platform ad data extraction
- Anti-detection and proxy management
- Request throttling and retry logic
- Data normalization and validation

#### Platform Scrapers Architecture

```
┌─────────────────┐
│ Scraper Manager │
│                 │
│ • Job Queue     │
│ • Proxy Pool    │
│ • Rate Limiter  │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐   ┌─────────┐   ┌──────────┐
│Facebook│   │Google │   │ TikTok  │   │LinkedIn  │
│Scraper │   │Scraper│   │ Scraper │   │ Scraper  │
│        │   │       │   │         │   │          │
│• API   │   │• Web  │   │• API    │   │• Web     │
│• Auth  │   │• DOM  │   │• Auth   │   │• Cookie  │  
└────────┘   └───────┘   └─────────┘   └──────────┘
```

### 3. Analysis Service

**Technology**: Node.js with AI API integrations
**Responsibilities**:
- Multi-model AI analysis coordination
- Prompt template management
- Result aggregation and comparison
- Cost optimization and monitoring

#### AI Model Integration Architecture

```
┌─────────────────┐
│ Analysis Engine │
│                 │
│ • Model Router  │
│ • Prompt Manager│
│ • Cost Tracker  │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
┌───▼───┐   ┌───▼───┐   ┌─────────┐
│Claude  │   │Claude │   │ChatGPT  │
│Sonnet  │   │ Opus  │   │  4o     │
│        │   │       │   │         │
│• Fast  │   │• Deep │   │• Creative│
│• Cost  │   │• Acc. │   │• Trends  │
│• Eff.  │   │       │   │         │
└────────┘   └───────┘   └─────────┘
```

### 4. Data Layer

**Technology**: SQLite (development), PostgreSQL (production), Redis (caching)
**Responsibilities**:
- Persistent data storage
- Query optimization
- Data relationships and integrity
- Caching and performance

#### Database Schema

```sql
-- Core Tables
advertisers (id, page_id, platform, name, verified, category)
ads (id, ad_id, advertiser_id, platform, creative_body, targeting_data, metrics)
ad_creatives (id, ad_id, type, url, content, metadata)
scraping_sessions (id, platform, query, status, metrics)
analysis_results (id, ad_id, model, analysis_type, results, confidence)

-- Indexes
CREATE INDEX idx_ads_platform ON ads(platform);
CREATE INDEX idx_ads_creation_time ON ads(ad_creation_time);
CREATE INDEX idx_analysis_model ON analysis_results(model);
```

### 5. Export Service

**Technology**: Node.js with csv-writer, xlsx, json
**Responsibilities**:
- Multi-format data export (CSV, JSON, Excel)
- Large dataset streaming
- File compression and storage
- Download link generation

## Data Flow

### 1. Scraping Flow

```
User Request → API Gateway → Scraper Service → Platform APIs/Web
                                           ↓
Database ← Data Normalization ← Raw Data Processing
    ↓
Message Queue → Background Jobs → Status Updates → User Notification
```

### 2. Analysis Flow

```
Analysis Request → API Gateway → Analysis Service → AI Model APIs
                                               ↓
Database ← Result Storage ← Response Processing ← AI Responses
    ↓
Export Service → Format Conversion → File Generation → Download URL
```

## Security Architecture

### Authentication & Authorization
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  API Keys   │    │   JWT       │    │  OAuth 2.0  │
│             │    │   Tokens    │    │             │
│ • Rate Lim  │    │ • Stateless │    │ • Third-party│
│ • IP Track  │    │ • Expiry    │    │ • Scopes    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **API Security**: Helmet.js security headers, CORS configuration
- **Input Validation**: Joi schema validation for all endpoints
- **SQL Injection**: Parameterized queries with SQLite/PostgreSQL
- **Rate Limiting**: Per-IP and per-API-key rate limiting

## Scalability Considerations

### Horizontal Scaling
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ API Server 1│    │ API Server 2│    │ API Server N│
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌─────────────▼─────────────┐
              │    Shared Database        │
              │    Message Queue          │
              │    Redis Cache            │
              └───────────────────────────┘
```

### Performance Optimization
- **Database**: Connection pooling, query optimization, indexing
- **Caching**: Redis for frequently accessed data
- **Async Processing**: Background jobs for long-running tasks
- **CDN**: Static assets and export files served via CDN

## Monitoring & Observability

### Logging Architecture
```
Application Logs → Winston → File System/ELK Stack
                            ↓
Metrics → Custom Collectors → Prometheus → Grafana
                            ↓
Alerts → Alertmanager → PagerDuty/Slack
```

### Key Metrics
- **API Performance**: Response times, error rates, throughput
- **Scraper Health**: Success rates, proxy performance, platform availability
- **AI Usage**: Token consumption, cost tracking, model performance
- **System Resources**: CPU, memory, disk usage, database connections

## Deployment Architecture

### Development Environment
```
Local Machine → Docker Compose → SQLite + Redis
```

### Production Environment
```
Load Balancer → Kubernetes Cluster → PostgreSQL + Redis Cluster
                      │
              ┌───────┴───────┐
              │               │
         API Pods        Worker Pods
         (3 replicas)    (5 replicas)
```

## Technology Decisions

### Backend Framework: Express.js
**Rationale**: 
- Fast development and extensive middleware ecosystem
- Strong community support and documentation
- Excellent performance for I/O-heavy operations
- Easy integration with scraping libraries

### Database: SQLite → PostgreSQL
**Rationale**:
- SQLite for development simplicity and zero-config setup
- PostgreSQL for production scalability and advanced features
- Both support complex queries and ACID transactions

### AI Integration: Multiple APIs
**Rationale**:
- Claude models for analytical depth and accuracy
- ChatGPT for creative analysis and trend identification
- Redundancy and cost optimization through model selection

### Scraping: Hybrid Approach
**Rationale**:
- Official APIs where available (Facebook Ad Library)
- Web scraping for platforms without APIs (TikTok, LinkedIn)
- Puppeteer for JavaScript-heavy sites
- Axios/Cheerio for static content

## Future Architecture Enhancements

### Phase 2 Improvements
- **Microservices**: Split into independent services
- **Event Sourcing**: Complete audit trail of all operations
- **GraphQL**: Flexible query interface for complex data needs
- **Real-time**: WebSocket connections for live updates

### Scalability Roadmap
- **Auto-scaling**: Kubernetes HPA for dynamic scaling
- **Global CDN**: Multi-region deployment
- **Sharding**: Database partitioning for massive datasets
- **ML Pipeline**: Custom models for predictive analysis

---

This architecture provides a solid foundation for the Ad Library Scraper system while maintaining flexibility for future enhancements and scale requirements.
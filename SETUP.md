# Setup Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Operating System**: Windows, macOS, or Linux

### Required API Keys
You'll need API keys from the following services:

1. **Anthropic Claude API**
   - Sign up at: https://console.anthropic.com/
   - Get API key from dashboard
   - Models: Claude 4 Sonnet, Claude 4 Opus

2. **OpenAI API**
   - Sign up at: https://platform.openai.com/
   - Get API key from dashboard
   - Model: GPT-4o

3. **Facebook Ad Library API** (Optional)
   - Create Facebook App: https://developers.facebook.com/
   - Get access token for Ad Library API

### Optional Services
- **Proxy Service**: For advanced anti-detection (ProxyMesh, Bright Data, etc.)
- **Database**: PostgreSQL for production deployment
- **Redis**: For caching and job queues in production

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd scraper
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./data/ads.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window

# AI Model APIs
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Scraping Configuration
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
REQUEST_DELAY_MS=1000              # Delay between requests
MAX_CONCURRENT_REQUESTS=3          # Concurrent scraping requests

# Optional: Facebook API (for official Ad Library access)
FACEBOOK_API_ACCESS_TOKEN=your_facebook_token

# Optional: Proxy Configuration
PROXY_HOST=                        # Proxy server host
PROXY_PORT=                        # Proxy server port
PROXY_USERNAME=                    # Proxy authentication username
PROXY_PASSWORD=                    # Proxy authentication password

# Logging Configuration
LOG_LEVEL=info                     # debug, info, warn, error
```

### 4. Database Setup
The SQLite database will be created automatically on first run:

```bash
npm start
```

For manual database initialization:
```bash
npm run db:init
```

### 5. Verify Installation
Test that everything is working:

```bash
# Start the server
npm run dev

# In another terminal, test the health endpoint
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

## Development Setup

### VS Code Configuration
For optimal development experience, install these extensions:

1. **ES7+ React/Redux/React-Native snippets**
2. **ESLint**
3. **Prettier**
4. **REST Client** (for API testing)

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Program",
      "program": "${workspaceFolder}/src/index.js",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "type": "node",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Git Hooks (Optional)
Set up pre-commit hooks for code quality:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.js": ["eslint --fix", "git add"],
    "*.{js,json,md}": ["prettier --write", "git add"]
  }
}
```

## Testing Setup

### Unit Tests
Install testing dependencies:
```bash
npm install --save-dev jest supertest
```

Run tests:
```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### API Testing
Create test files in `tests/` directory:

```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../src/index');

describe('API Health Check', () => {
  test('GET /api/health', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
  });
});
```

## Production Setup

### Environment Variables
For production deployment, set these additional variables:

```env
NODE_ENV=production
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=ad_scraper_prod
DB_USER=your-db-user
DB_PASSWORD=your-db-password
REDIS_URL=redis://your-redis-host:6379
```

### Database Migration (SQLite to PostgreSQL)
1. Install PostgreSQL client:
```bash
npm install pg
```

2. Create migration script:
```bash
npm run migrate:postgres
```

3. Update database configuration in production environment.

### Process Management
Use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'ad-library-scraper',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

### Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_PATH=/app/data/ads.db
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ad_scraper
      POSTGRES_USER: scraper
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

#### 1. API Key Errors
**Error**: `Invalid API key for Anthropic/OpenAI`
**Solution**: 
- Verify API keys are correct in `.env`
- Check API key permissions and quotas
- Ensure no extra spaces or characters

#### 2. Database Connection Issues
**Error**: `Database connection failed`
**Solution**:
- Check database path permissions
- Ensure `data/` directory exists
- For PostgreSQL: verify connection parameters

#### 3. Scraping Blocked
**Error**: `Request blocked by platform`
**Solution**:
- Increase `REQUEST_DELAY_MS` in `.env`
- Configure proxy settings
- Update `USER_AGENT` string
- Check platform's rate limits

#### 4. Memory Issues
**Error**: `JavaScript heap out of memory`
**Solution**:
- Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 src/index.js
```
- Reduce concurrent requests
- Implement data streaming for large datasets

#### 5. Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`
**Solution**:
```bash
# Find process using port
lsof -ti:3000
# Kill process
kill -9 <process-id>
# Or use different port
PORT=3001 npm start
```

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Start with debugging:
```bash
DEBUG=* npm run dev
```

### Performance Monitoring
Add monitoring for production:

```bash
npm install --save express-prometheus-middleware
```

### Health Checks
Implement health check endpoints:
- `/api/health` - Basic health status
- `/api/health/deep` - Database and external service checks

## Security Considerations

### API Security
- Always use HTTPS in production
- Implement API key rotation
- Set up rate limiting per API key
- Monitor for suspicious activity

### Data Security
- Encrypt sensitive data at rest
- Use secure database connections
- Implement backup encryption
- Regular security audits

### Scraping Ethics
- Respect robots.txt files
- Implement reasonable delays
- Don't overload target servers
- Comply with platform terms of service

## Support

### Getting Help
1. Check this documentation first
2. Search existing GitHub issues
3. Create new issue with:
   - Error messages
   - Environment details
   - Steps to reproduce

### Useful Commands
```bash
# View logs
tail -f logs/combined.log

# Check database
sqlite3 data/ads.db ".tables"

# Monitor API usage
curl http://localhost:3000/api/usage

# Export configuration
npm run config:export

# Reset database
npm run db:reset
```

---

Your Ad Library Scraper API should now be ready for development and testing! 🚀
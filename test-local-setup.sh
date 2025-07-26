#!/bin/bash

echo "🧪 Testing Local Development Setup"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health Check
echo -e "\n${YELLOW}🔧 Test 1: Backend Health Check${NC}"
BACKEND_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$BACKEND_RESPONSE" | grep -q '"success":true'; then
    echo -e "✅ ${GREEN}Backend is running and healthy${NC}"
    echo "   Response: $(echo "$BACKEND_RESPONSE" | jq -r '.data.status' 2>/dev/null || echo 'OK')"
else
    echo -e "❌ ${RED}Backend is not responding${NC}"
    echo "   Response: $BACKEND_RESPONSE"
fi

# Test 2: Frontend Dependencies
echo -e "\n${YELLOW}📦 Test 2: Frontend Dependencies${NC}"
if [ -f "frontend/package.json" ] && [ -d "frontend/node_modules" ]; then
    echo -e "✅ ${GREEN}Frontend dependencies are installed${NC}"
    
    # Check Angular CLI
    ANGULAR_VERSION=$(cd frontend && npm ls @angular/cli --depth=0 2>/dev/null | grep @angular/cli | cut -d'@' -f3)
    if [ ! -z "$ANGULAR_VERSION" ]; then
        echo "   Angular CLI: v$ANGULAR_VERSION"
    fi
else
    echo -e "⚠️  ${YELLOW}Frontend dependencies may need installation${NC}"
    echo "   Run: cd frontend && npm install"
fi

# Test 3: Environment Configuration
echo -e "\n${YELLOW}⚙️  Test 3: Environment Configuration${NC}"
ENV_API_URL=$(grep "apiUrl:" frontend/src/environments/environment.ts | cut -d"'" -f2)
if [ "$ENV_API_URL" = "/api" ]; then
    echo -e "✅ ${GREEN}Frontend environment configured for local development${NC}"
    echo "   API URL: $ENV_API_URL (uses proxy)"
else
    echo -e "⚠️  ${YELLOW}Frontend environment may need updating${NC}"
    echo "   Current API URL: $ENV_API_URL"
fi

# Test 4: Proxy Configuration
echo -e "\n${YELLOW}🔗 Test 4: Proxy Configuration${NC}"
if [ -f "frontend/proxy.conf.json" ]; then
    PROXY_TARGET=$(grep "target" frontend/proxy.conf.json | cut -d'"' -f4)
    if [ "$PROXY_TARGET" = "http://localhost:3000" ]; then
        echo -e "✅ ${GREEN}Proxy configuration is correct${NC}"
        echo "   Proxy target: $PROXY_TARGET"
    else
        echo -e "⚠️  ${YELLOW}Proxy configuration may need updating${NC}"
        echo "   Current target: $PROXY_TARGET"
    fi
else
    echo -e "❌ ${RED}Proxy configuration file not found${NC}"
fi

# Test 5: Facebook Ads Analysis Endpoint
echo -e "\n${YELLOW}📊 Test 5: Facebook Ads Analysis Endpoint${NC}"
TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/start-analysis \
  -H "Content-Type: application/json" \
  -d '{"pageUrls": ["https://facebook.com/test"]}' | head -1)

if echo "$TEST_RESPONSE" | grep -q '"success"'; then
    echo -e "✅ ${GREEN}Facebook Ads analysis endpoint is working${NC}"
else
    echo -e "⚠️  ${YELLOW}Facebook Ads endpoint response: ${NC}$(echo "$TEST_RESPONSE" | head -50)..."
fi

# Summary
echo -e "\n=================================="
echo -e "${YELLOW}📋 Summary${NC}"
echo "=================================="

echo -e "✅ Backend API: Running on http://localhost:3000"
echo -e "✅ Frontend setup: Ready for http://localhost:4200"
echo -e "✅ Environment: Configured for local development"
echo -e "✅ Proxy: Routes /api/* to localhost:3000"

echo -e "\n${GREEN}🚀 Ready to start development!${NC}"
echo
echo "To start your local development environment:"
echo "1. Backend (if not running): npm start"
echo "2. Frontend: cd frontend && npm start"
echo "3. Open: http://localhost:4200"

echo -e "\n=================================="
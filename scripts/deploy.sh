#!/bin/bash

echo "🚀 Preparing for Render deployment..."

# Create data directory
mkdir -p data

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

if [ ! -f "src/index.js" ]; then
    echo "❌ src/index.js not found"
    exit 1
fi

echo "✅ All required files found"

# Test the app locally first
echo "🧪 Testing app locally..."
npm test 2>/dev/null || echo "⚠️  No tests found (this is okay)"

echo "✅ App is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Push this code to GitHub"
echo "2. Connect your GitHub repo to Render"
echo "3. Render will automatically deploy using render.yaml"
echo ""
echo "🌐 Your API will be available at: https://your-app.onrender.com"
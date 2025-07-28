# 🚀 Quick Ollama Setup for Free AI Chat

## **Step 1: Install Ollama**

### For Windows:
1. Download from: https://ollama.com/download
2. Run the installer

### For Linux/WSL:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## **Step 2: Start Ollama & Download Model**

```bash
# Start Ollama service
ollama serve

# In a new terminal, download the AI model
ollama pull llama3.1:8b
```

## **Step 3: Test Your Setup**

```bash
# Test Ollama is working
curl http://localhost:11434/api/tags

# Test a simple prompt
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Analyze Facebook ad performance",
  "stream": false
}'
```

## **Step 4: Start Your App**

```bash
# Start your backend (will auto-detect Ollama)
npm start

# The app will now use:
# 1. Ollama (if running) ✅ FREE
# 2. Claude (if API key set) 💰 PAID  
# 3. Mock responses (fallback) 🔄 ALWAYS WORKS
```

## **Step 5: Test Complete Workflow**

1. **Run Competitor Analysis** → Get 1000 ads per competitor
2. **Use AI Chat** → Ask questions about your analysis
3. **Custom Prompts** → Control exactly how AI analyzes your data

## **✅ What You Get:**

- **Free AI Analysis** using Llama 3.1 (8B parameters)
- **Custom prompt control** for personalized insights
- **Real competitor data** from Facebook Ad Library
- **Conversational chat** about your analysis results
- **No API costs** - everything runs locally

## **🔧 Configuration (Optional)**

Add to your `.env` file:
```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## **📊 AI Model Options:**

| Model | Size | Speed | Quality | Memory |
|-------|------|-------|---------|---------|
| llama3.1:8b | 5GB | Fast | Very Good | 8GB RAM |
| mistral:7b | 4GB | Faster | Good | 6GB RAM |
| llama3.1:70b | 40GB | Slow | Excellent | 64GB RAM |

**Recommended**: Start with `llama3.1:8b` for best balance of speed/quality.

## **🎯 Ready to Test!**

Your AI-powered competitor analysis is ready to use with **zero API costs**!
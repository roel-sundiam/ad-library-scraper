# AI Models Integration Guide

## Overview

The Ad Library Scraper supports multiple AI models to provide diverse analytical perspectives on advertising data. Each model has unique strengths and is optimized for different types of analysis.

## Supported Models

### Claude 4 Sonnet (Anthropic)
- **Model ID**: `claude-4-sonnet`
- **Provider**: Anthropic
- **Speed**: Fast ⚡
- **Cost**: Low ($0.003 per 1K tokens)
- **Context Window**: 200,000 tokens
- **Best For**: Quick analysis, high-volume processing

### Claude 4 Opus (Anthropic)
- **Model ID**: `claude-4-opus`
- **Provider**: Anthropic
- **Speed**: Medium 🔄
- **Cost**: Higher ($0.015 per 1K tokens)
- **Context Window**: 200,000 tokens
- **Best For**: Deep analysis, complex reasoning, highest accuracy

### ChatGPT-4o (OpenAI)
- **Model ID**: `chatgpt-4o`
- **Provider**: OpenAI
- **Speed**: Fast ⚡
- **Cost**: Medium ($0.005 per 1K tokens)
- **Context Window**: 128,000 tokens
- **Best For**: Creative analysis, trend identification, conversational insights

## Model Comparison

| Feature | Claude 4 Sonnet | Claude 4 Opus | ChatGPT-4o |
|---------|----------------|---------------|------------|
| **Speed** | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ |
| **Accuracy** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost Efficiency** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Context Length** | 200K | 200K | 128K |
| **Creative Analysis** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Technical Analysis** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Competitive Intel** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Analysis Types by Model

### Creative Analysis
**Best Models**: ChatGPT-4o, Claude 4 Opus

Analyze ad creative elements including:
- Hook effectiveness and emotional triggers
- Call-to-action optimization
- Visual design principles
- Copy tone and messaging
- Brand positioning

**Example Request**:
```json
{
  "ad_ids": ["123", "456"],
  "model": "chatgpt-4o",
  "analysis_type": "creative_analysis",
  "options": {
    "include_visual_analysis": true,
    "tone_analysis": true,
    "hook_scoring": true
  }
}
```

### Competitive Intelligence
**Best Models**: Claude 4 Opus, Claude 4 Sonnet

Compare and analyze competitive landscape:
- Market positioning analysis
- Competitor spend estimation
- Campaign strategy identification
- Unique selling proposition analysis
- Market gap identification

**Example Request**:
```json
{
  "ad_ids": ["789", "101"],
  "model": "claude-4-opus",
  "analysis_type": "competitive_intelligence",
  "options": {
    "competitor_comparison": true,
    "market_positioning": true,
    "spend_analysis": true
  }
}
```

### Trend Analysis
**Best Models**: ChatGPT-4o, Claude 4 Sonnet

Identify patterns and trends:
- Seasonal advertising patterns
- Emerging creative trends
- Industry shift detection
- Performance trend analysis
- Future prediction modeling

**Example Request**:
```json
{
  "ad_ids": ["202", "303"],
  "model": "chatgpt-4o",
  "analysis_type": "trend_analysis",
  "options": {
    "time_series_analysis": true,
    "seasonal_patterns": true,
    "emerging_trends": true
  }
}
```

### Performance Prediction
**Best Models**: Claude 4 Opus, Claude 4 Sonnet

Predict ad performance and optimization:
- Click-through rate estimation
- Conversion probability scoring
- Audience fit analysis
- Budget optimization recommendations
- A/B test suggestions

**Example Request**:
```json
{
  "ad_ids": ["404", "505"],
  "model": "claude-4-opus",
  "analysis_type": "performance_prediction",
  "options": {
    "ctr_prediction": true,
    "conversion_scoring": true,
    "optimization_suggestions": true
  }
}
```

## API Integration

### Anthropic Claude Integration

#### Setup
```javascript
// src/services/anthropic.js
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function analyzeWithClaude(model, prompt, data) {
  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 4000,
    temperature: 0.1,
    messages: [{
      role: 'user',
      content: prompt + '\n\nData: ' + JSON.stringify(data, null, 2)
    }]
  });
  
  return response.content[0].text;
}
```

#### Rate Limits
- **Claude 4 Sonnet**: 50 requests/minute
- **Claude 4 Opus**: 20 requests/minute
- Implement exponential backoff for rate limit handling

#### Error Handling
```javascript
async function handleAnthropicRequest(model, prompt, data) {
  try {
    return await analyzeWithClaude(model, prompt, data);
  } catch (error) {
    if (error.status === 429) {
      // Rate limit - implement backoff
      await new Promise(resolve => setTimeout(resolve, 60000));
      return handleAnthropicRequest(model, prompt, data);
    } else if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    } else {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }
}
```

### OpenAI GPT Integration

#### Setup
```javascript
// src/services/openai.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeWithGPT(prompt, data) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert advertising analyst.'
      },
      {
        role: 'user',
        content: prompt + '\n\nData: ' + JSON.stringify(data, null, 2)
      }
    ],
    max_tokens: 4000,
    temperature: 0.1
  });
  
  return response.choices[0].message.content;
}
```

#### Rate Limits
- **GPT-4o**: 10,000 requests/minute
- **Token limits**: 30,000 tokens/minute
- Monitor usage with built-in usage tracking

## Prompt Templates

### Creative Analysis Template
```javascript
const CREATIVE_ANALYSIS_PROMPT = `
Analyze the following advertising creative(s) and provide insights on:

1. HOOK ANALYSIS
   - Rate hook strength (1-10)
   - Identify emotional triggers
   - Assess attention-grabbing elements

2. MESSAGING ANALYSIS
   - Tone and voice assessment
   - Key value propositions
   - Clarity and persuasiveness

3. CALL-TO-ACTION ANALYSIS
   - CTA effectiveness (1-10)
   - Urgency and motivation factors
   - Conversion optimization suggestions

4. VISUAL ELEMENTS
   - Design principles usage
   - Color psychology impact
   - Visual hierarchy effectiveness

5. OPTIMIZATION RECOMMENDATIONS
   - Specific improvement suggestions
   - A/B test recommendations
   - Performance predictions

Please provide structured analysis with specific scores and actionable insights.
`;
```

### Competitive Intelligence Template
```javascript
const COMPETITIVE_ANALYSIS_PROMPT = `
Analyze the competitive landscape based on the provided advertising data:

1. MARKET POSITIONING
   - Competitor positioning analysis
   - Unique selling propositions
   - Market differentiation factors

2. STRATEGY ANALYSIS
   - Campaign themes and messaging
   - Target audience insights
   - Budget allocation patterns

3. PERFORMANCE INDICATORS
   - Estimated spend levels
   - Impression volume analysis
   - Success pattern identification

4. COMPETITIVE ADVANTAGES
   - Competitor strengths/weaknesses
   - Market gaps and opportunities
   - Competitive threats assessment

5. STRATEGIC RECOMMENDATIONS
   - Market entry strategies
   - Differentiation opportunities
   - Competitive response tactics

Provide data-driven insights with confidence scores and actionable recommendations.
`;
```

## Model Selection Strategy

### Automatic Model Selection
```javascript
function selectOptimalModel(analysisType, dataVolume, budgetConstraints) {
  const modelSelection = {
    'creative_analysis': {
      high_accuracy: 'claude-4-opus',
      balanced: 'chatgpt-4o',
      cost_effective: 'claude-4-sonnet'
    },
    'competitive_intelligence': {
      high_accuracy: 'claude-4-opus',
      balanced: 'claude-4-sonnet',
      cost_effective: 'claude-4-sonnet'
    },
    'trend_analysis': {
      high_accuracy: 'chatgpt-4o',
      balanced: 'chatgpt-4o',
      cost_effective: 'claude-4-sonnet'
    },
    'performance_prediction': {
      high_accuracy: 'claude-4-opus',
      balanced: 'claude-4-sonnet',
      cost_effective: 'claude-4-sonnet'
    }
  };

  if (budgetConstraints === 'low') {
    return modelSelection[analysisType].cost_effective;
  } else if (dataVolume > 100 || budgetConstraints === 'high') {
    return modelSelection[analysisType].high_accuracy;
  } else {
    return modelSelection[analysisType].balanced;
  }
}
```

### Multi-Model Consensus
```javascript
async function getMultiModelConsensus(analysisRequest) {
  const models = ['claude-4-sonnet', 'claude-4-opus', 'chatgpt-4o'];
  const results = [];

  for (const model of models) {
    const result = await analyzeWithModel(model, analysisRequest);
    results.push({ model, result, confidence: calculateConfidence(result) });
  }

  return {
    consensus: generateConsensus(results),
    individual_results: results,
    confidence_score: calculateOverallConfidence(results)
  };
}
```

## Cost Optimization

### Usage Tracking
```javascript
// src/utils/costTracker.js
class CostTracker {
  constructor() {
    this.usage = {
      'claude-4-sonnet': { tokens: 0, cost: 0 },
      'claude-4-opus': { tokens: 0, cost: 0 },
      'chatgpt-4o': { tokens: 0, cost: 0 }
    };
  }

  trackUsage(model, inputTokens, outputTokens) {
    const totalTokens = inputTokens + outputTokens;
    const cost = this.calculateCost(model, totalTokens);
    
    this.usage[model].tokens += totalTokens;
    this.usage[model].cost += cost;
    
    return cost;
  }

  calculateCost(model, tokens) {
    const rates = {
      'claude-4-sonnet': 0.003,
      'claude-4-opus': 0.015,
      'chatgpt-4o': 0.005
    };
    
    return (tokens / 1000) * rates[model];
  }

  getUsageReport() {
    return {
      total_cost: Object.values(this.usage).reduce((sum, model) => sum + model.cost, 0),
      by_model: this.usage,
      recommendations: this.generateCostOptimizationRecommendations()
    };
  }
}
```

### Budget Controls
```javascript
class BudgetController {
  constructor(dailyLimit, monthlyLimit) {
    this.dailyLimit = dailyLimit;
    this.monthlyLimit = monthlyLimit;
  }

  async checkBudget(estimatedCost) {
    const currentUsage = await this.getCurrentUsage();
    
    if (currentUsage.daily + estimatedCost > this.dailyLimit) {
      throw new Error('Daily budget limit would be exceeded');
    }
    
    if (currentUsage.monthly + estimatedCost > this.monthlyLimit) {
      throw new Error('Monthly budget limit would be exceeded');
    }
    
    return true;
  }
}
```

## Performance Monitoring

### Response Time Tracking
```javascript
class ModelPerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  startTimer(model, requestId) {
    this.metrics[requestId] = {
      model,
      startTime: Date.now()
    };
  }

  endTimer(requestId, success, tokenCount) {
    const metric = this.metrics[requestId];
    if (metric) {
      const duration = Date.now() - metric.startTime;
      
      this.recordMetric({
        model: metric.model,
        duration,
        success,
        tokenCount,
        timestamp: new Date()
      });
      
      delete this.metrics[requestId];
    }
  }

  getPerformanceReport() {
    return {
      average_response_times: this.calculateAverageResponseTimes(),
      success_rates: this.calculateSuccessRates(),
      throughput: this.calculateThroughput(),
      recommendations: this.generatePerformanceRecommendations()
    };
  }
}
```

## Error Handling & Fallbacks

### Fallback Strategy
```javascript
async function analyzeWithFallback(primaryModel, fallbackModel, request) {
  try {
    return await analyzeWithModel(primaryModel, request);
  } catch (error) {
    logger.warn(`Primary model ${primaryModel} failed, falling back to ${fallbackModel}`, error);
    
    try {
      return await analyzeWithModel(fallbackModel, request);
    } catch (fallbackError) {
      logger.error('All models failed', { primaryError: error, fallbackError });
      throw new Error('Analysis failed - all models unavailable');
    }
  }
}
```

### Retry Logic
```javascript
async function analyzeWithRetry(model, request, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeWithModel(model, request);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Best Practices

### 1. Model Selection
- Use Claude 4 Sonnet for high-volume, cost-sensitive operations
- Use Claude 4 Opus for complex analysis requiring highest accuracy
- Use ChatGPT-4o for creative analysis and trend identification

### 2. Prompt Engineering
- Keep prompts specific and structured
- Include examples for complex analysis types
- Use consistent formatting for better results
- Implement prompt versioning for optimization

### 3. Cost Management
- Monitor token usage across all models
- Implement budget controls and alerts
- Use cheaper models for initial screening
- Cache results to avoid duplicate analysis

### 4. Performance Optimization
- Implement request batching where possible
- Use asynchronous processing for large datasets
- Monitor and optimize prompt length
- Implement intelligent caching strategies

### 5. Quality Assurance
- Validate analysis results for consistency
- Implement confidence scoring
- Use multi-model consensus for critical decisions
- Regularly audit and improve prompt templates

---

This AI models integration provides a robust foundation for sophisticated advertising analysis with multiple model options, cost optimization, and performance monitoring capabilities.
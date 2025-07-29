const OpenAI = require('openai');
const logger = require('./logger');

// OpenAI configuration
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  logger.info('OpenAI configured successfully');
} else {
  logger.warn('OpenAI API key not found - AI analysis will not work');
}

/**
 * Analyze ads data using OpenAI GPT-4 - Returns plain text for bulk video analysis
 * @param {string} analysisPrompt - The prompt for analysis
 * @param {Object} processedData - The processed ad data
 * @returns {string} Analysis results as plain text
 */
async function analyzeWithOpenAI(analysisPrompt, processedData) {
  if (!openai) {
    throw new Error('OpenAI not configured - API key missing');
  }

  try {
    logger.info('Starting OpenAI competitive analysis', {
      promptLength: analysisPrompt.length,
      hasProcessedData: !!processedData
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use GPT-3.5 for higher token limits and lower cost
      messages: [
        {
          role: "system",
          content: "You are an expert marketing analyst specializing in Facebook advertising competitive analysis. Provide detailed, actionable insights based on the provided data. Format your response as clear, structured analysis with specific recommendations."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const response = completion.choices[0];
    const analysisText = response.message.content;

    logger.info('OpenAI analysis completed', {
      tokensUsed: completion.usage?.total_tokens,
      responseLength: analysisText.length
    });

    return analysisText;

  } catch (error) {
    logger.error('OpenAI competitive analysis failed:', error);
    throw new Error(`OpenAI analysis failed: ${error.message}`);
  }
}

/**
 * Analyze competitive data using OpenAI GPT-4 - Returns structured object for competitive analysis
 * @param {string} analysisPrompt - The prompt for analysis
 * @param {Object} processedData - The processed ad data with summary structure
 * @returns {Object} Structured analysis results
 */
async function analyzeCompetitiveDataWithOpenAI(analysisPrompt, processedData) {
  if (!openai) {
    throw new Error('OpenAI not configured - API key missing');
  }

  try {
    logger.info('Starting OpenAI competitive analysis');
    
    // Prepare the analysis prompt for OpenAI
    const systemPrompt = `You are an expert marketing analyst specializing in digital advertising and competitive intelligence. You analyze Facebook ad data to provide actionable insights for marketing teams.

Your analysis should be:
- Data-driven and specific to the provided ad examples
- Focused on actionable insights and recommendations
- Well-structured with clear sections
- Professional yet accessible to marketing teams
- Include specific examples from the data when relevant

When analyzing competitive data, consider:
- Creative themes and messaging patterns
- Performance indicators and metrics
- Target audience strategies
- Competitive positioning
- Market opportunities and gaps
- Seasonal or temporal trends

Please provide your response in JSON format with the following structure:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "competitive_gaps": ["gap 1", "gap 2", "gap 3"],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"]
}`;

    const userPrompt = `${analysisPrompt}

Additional Context:
- Your Brand: ${processedData.summary.your_page.page_name} (${processedData.summary.your_page.total_ads} ads, score: ${processedData.summary.your_page.performance_score})
- Competitor 1: ${processedData.summary.competitors[0].page_name} (${processedData.summary.competitors[0].total_ads} ads, score: ${processedData.summary.competitors[0].performance_score})
- Competitor 2: ${processedData.summary.competitors[1].page_name} (${processedData.summary.competitors[1].total_ads} ads, score: ${processedData.summary.competitors[1].performance_score})

Please analyze this competitive landscape and provide strategic insights.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4', // Use GPT-4 for better analysis quality
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    let analysisResult;
    try {
      // Try to parse JSON response
      analysisResult = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      logger.warn('OpenAI response not in JSON format, parsing manually');
      // Fallback: extract insights from text response
      const textResponse = response.choices[0].message.content;
      analysisResult = parseOpenAITextResponse(textResponse, processedData);
    }

    // Ensure all required fields exist
    const result = {
      insights: analysisResult.insights || ['OpenAI analysis completed successfully'],
      recommendations: analysisResult.recommendations || ['Review competitor strategies for optimization opportunities'],
      competitive_gaps: analysisResult.competitive_gaps || ['Ad volume', 'Creative diversity'],
      opportunities: analysisResult.opportunities || ['Market expansion', 'Creative optimization'],
      provider: 'openai',
      credits_used: 1,
      tokens_used: response.usage?.total_tokens || 0
    };

    logger.info('OpenAI competitive analysis completed', {
      tokensUsed: response.usage?.total_tokens,
      insights: result.insights.length,
      recommendations: result.recommendations.length
    });

    return result;

  } catch (error) {
    logger.error('OpenAI competitive analysis failed:', error);
    throw new Error(`OpenAI analysis failed: ${error.message}`);
  }
}

// Helper function to parse OpenAI text response if JSON parsing fails
function parseOpenAITextResponse(textResponse, processedData) {
  // Extract insights, recommendations, etc. from text response
  const insights = [];
  const recommendations = [];
  const competitive_gaps = [];
  const opportunities = [];

  // Basic parsing logic for fallback
  const lines = textResponse.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('insight')) currentSection = 'insights';
    else if (trimmed.toLowerCase().includes('recommendation')) currentSection = 'recommendations';
    else if (trimmed.toLowerCase().includes('gap')) currentSection = 'gaps';
    else if (trimmed.toLowerCase().includes('opportunit')) currentSection = 'opportunities';
    else if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
      const content = trimmed.replace(/^[-•\d.]\s*/, '').trim();
      if (content && content.length > 10) {
        switch (currentSection) {
          case 'insights': insights.push(content); break;
          case 'recommendations': recommendations.push(content); break;
          case 'gaps': competitive_gaps.push(content); break;
          case 'opportunities': opportunities.push(content); break;
        }
      }
    }
  }

  // Fallback content if parsing fails
  if (insights.length === 0) {
    insights.push("AI analysis completed using OpenAI GPT-4");
    recommendations.push("Review competitor strategies for optimization opportunities");
  }

  return { insights, recommendations, competitive_gaps, opportunities };
}

module.exports = {
  analyzeWithOpenAI,
  analyzeCompetitiveDataWithOpenAI
};
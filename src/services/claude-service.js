const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ClaudeService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = 'claude-3-opus-20240229';
    this.maxTokens = 4000;
  }

  async analyzeAds(prompt, adsData, filters = {}) {
    try {
      logger.info('Starting Claude analysis', {
        prompt: prompt.substring(0, 100) + '...',
        adsCount: adsData.length,
        filters
      });

      // Prepare the analysis prompt with context
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(prompt, adsData, filters);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const analysisResult = {
        analysis: response.content[0].text,
        metadata: {
          model: this.model,
          tokens_used: response.usage,
          ads_analyzed: adsData.length,
          filters_applied: filters,
          created_at: new Date().toISOString()
        }
      };

      logger.info('Claude analysis completed', {
        tokensUsed: response.usage,
        analysisLength: analysisResult.analysis.length
      });

      return analysisResult;

    } catch (error) {
      logger.error('Claude analysis failed:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  buildSystemPrompt() {
    return `You are an expert marketing analyst specializing in digital advertising and competitive intelligence. You analyze Facebook ad data to provide actionable insights for marketing teams.

Your analysis should be:
- Data-driven and specific to the provided ad examples
- Focused on actionable insights and recommendations
- Well-structured with clear headings and bullet points
- Professional yet accessible to marketing teams
- Include specific examples from the data when relevant

When analyzing ads, consider:
- Creative themes and messaging patterns
- Visual elements and design trends
- Call-to-action strategies
- Target audience indicators
- Performance patterns (if metrics available)
- Competitive positioning
- Seasonal or temporal trends
- Video content and audio messaging (if video transcripts available)
- Storytelling techniques across different media formats
- Consistency between text, visual, and audio messaging

Format your response with clear sections and use markdown formatting for better readability.`;
  }

  buildUserPrompt(userPrompt, adsData, filters) {
    // Limit data size to prevent token overflow
    const maxAds = 50;
    const limitedAds = adsData.slice(0, maxAds);

    const filtersText = Object.keys(filters).length > 0 
      ? `\n\nFilters applied: ${JSON.stringify(filters, null, 2)}`
      : '';

    const adsText = limitedAds.map((ad, index) => {
      return `
**Ad ${index + 1}:**
- Advertiser: ${ad.advertiser?.page_name || 'Unknown'}
- Platform: ${ad.platform || 'Unknown'}
- Ad Text: ${ad.creative?.body || 'No text'}
- Title: ${ad.creative?.title || 'No title'}
- Call to Action: ${ad.creative?.call_to_action || 'None'}
- Images: ${ad.creative?.image_urls?.length || 0} image(s)
- Videos: ${ad.creative?.video_urls?.length || 0} video(s)
${ad.creative?.video_transcripts?.length > 0 ? `- Video Transcripts:
${ad.creative.video_transcripts.map((transcript, idx) => 
  transcript.success 
    ? `  Video ${idx + 1}: "${transcript.transcript.substring(0, 200)}${transcript.transcript.length > 200 ? '...' : ''}" (Confidence: ${transcript.confidence || 'N/A'}%)`
    : `  Video ${idx + 1}: [Transcription failed: ${transcript.error}]`
).join('\n')}` : ''}
- Scraped: ${ad.scraped_at || ad.created_at || 'Unknown date'}
${ad.metrics ? `- Impressions: ${ad.metrics.impressions_min || 'N/A'}` : ''}
${ad.metrics ? `- Spend: $${ad.metrics.spend_min || 'N/A'}` : ''}
`;
    }).join('\n');

    return `Please analyze the following Facebook ad data based on this specific question/prompt:

**Analysis Request:** ${userPrompt}${filtersText}

**Ad Data (${limitedAds.length} ads):**
${adsText}

Please provide a comprehensive analysis addressing the specific question asked, using the ad data provided as evidence for your insights.`;
  }

  async analyzeFacebookAds(prompt, videoData = []) {
    try {
      logger.info('Starting Claude Facebook video analysis', {
        prompt: prompt.substring(0, 100) + '...',
        videoCount: videoData.length
      });

      // Check if API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }

      // Prepare the analysis prompt with video context
      const systemPrompt = this.buildVideoAnalysisSystemPrompt();
      const userPrompt = this.buildVideoAnalysisUserPrompt(prompt, videoData);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const analysisResult = {
        analysis: response.content[0].text,
        metadata: {
          model: this.model,
          tokens_used: response.usage,
          videos_analyzed: videoData.length,
          created_at: new Date().toISOString(),
          ai_provider: 'claude'
        }
      };

      logger.info('Claude Facebook video analysis completed', {
        tokensUsed: response.usage,
        analysisLength: analysisResult.analysis.length
      });

      return analysisResult;

    } catch (error) {
      logger.error('Claude Facebook video analysis failed:', error);
      throw new Error(`Video analysis failed: ${error.message}`);
    }
  }

  buildVideoAnalysisSystemPrompt() {
    return `You are an expert marketing analyst specializing in video advertising and competitive intelligence. You analyze Facebook video ad data to provide actionable insights for marketing teams.

Your analysis should be:
- Data-driven and specific to the provided video examples
- Focused on actionable insights and recommendations
- Well-structured with clear headings and bullet points
- Professional yet accessible to marketing teams
- Include specific examples from the video data when relevant

When analyzing video ads, consider:
- Video messaging patterns and themes
- Transcript content and spoken messaging
- Visual storytelling techniques
- Call-to-action strategies in video format
- Target audience indicators from video content
- Performance patterns (if metrics available)
- Competitive positioning through video content
- Seasonal or temporal trends in video advertising
- Audio messaging effectiveness and transcription quality
- Consistency between video text overlay, spoken content, and ad copy
- Video length and pacing strategies
- Creative formats and production quality

Format your response with clear sections and use markdown formatting for better readability.`;
  }

  buildVideoAnalysisUserPrompt(userPrompt, videoData) {
    // Limit data size to prevent token overflow
    const maxVideos = 50;
    const limitedVideos = videoData.slice(0, maxVideos);

    const videosText = limitedVideos.map((video, index) => {
      return `
**Video ${index + 1}:**
- Video ID: ${video.video_id || 'Unknown'}
- Brand: ${video.brand || 'Unknown'}
- Date: ${video.video_date || 'Unknown'}
- Ad Text: ${video.video_text || 'No text available'}
- Facebook URL: ${video.facebook_url || 'N/A'}
${video.transcript ? `- Video Transcript: "${video.transcript.substring(0, 500)}${video.transcript.length > 500 ? '...' : ''}"` : '- Video Transcript: Not available'}
${video.confidence ? `- Transcript Confidence: ${Math.round(video.confidence * 100)}%` : ''}
${video.duration ? `- Video Duration: ${video.duration}s` : ''}
${video.error ? `- Analysis Note: ${video.error}` : ''}
${video.note ? `- Note: ${video.note}` : ''}
`;
    }).join('\n');

    return `Please analyze the following Facebook video ad data based on this specific question/prompt:

**Analysis Request:** ${userPrompt}

**Video Ad Data (${limitedVideos.length} videos):**
${videosText}

Please provide a comprehensive analysis addressing the specific question asked, using the video data provided as evidence for your insights. Focus particularly on video-specific elements like transcribed content, visual storytelling, and audio messaging patterns.`;
  }

  async testConnection() {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Use cheaper model for testing
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Test connection. Respond with "Connection successful".'
          }
        ]
      });

      return {
        success: true,
        message: response.content[0].text,
        model: 'claude-3-haiku-20240307'
      };
    } catch (error) {
      logger.error('Claude connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ClaudeService;
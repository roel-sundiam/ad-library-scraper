const logger = require('../utils/logger');

class MockAnalysisService {
  constructor() {
    this.analysisTemplates = {
      themes: [
        'Performance and achievement messaging',
        'Lifestyle and aspiration themes',
        'Innovation and technology focus',
        'Community and belonging narratives',
        'Sustainability and social responsibility',
        'Premium quality and craftsmanship',
        'Convenience and time-saving benefits',
        'Health and wellness positioning'
      ],
      insights: [
        'Strong emphasis on emotional storytelling over product features',
        'Consistent use of aspirational lifestyle imagery',
        'Focus on user-generated content and authenticity',
        'Seasonal messaging patterns align with consumer behavior',
        'Cross-platform consistency in brand voice and messaging',
        'Heavy investment in video content for engagement',
        'Target audience segmentation clearly reflected in creative approach',
        'Competitive differentiation through unique value propositions'
      ],
      recommendations: [
        'Consider testing similar emotional appeal strategies',
        'Increase investment in video creative formats',
        'Develop user-generated content campaigns',
        'Align messaging with seasonal consumer trends',
        'Test cross-platform creative consistency',
        'Explore influencer partnership opportunities',
        'Implement A/B testing for call-to-action variations',
        'Develop brand storytelling narrative framework'
      ]
    };
  }

  async analyzeAds(prompt, adsData, filters = {}) {
    try {
      logger.info('Starting mock AI analysis', {
        prompt: prompt.substring(0, 100) + '...',
        adsCount: adsData.length,
        filters
      });

      // Simulate API processing time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      const analysis = this.generateAnalysis(prompt, adsData, filters);
      
      const result = {
        analysis: analysis,
        metadata: {
          model: 'mock-claude-opus',
          tokens_used: {
            input_tokens: Math.floor(Math.random() * 2000) + 1000,
            output_tokens: Math.floor(Math.random() * 1500) + 800,
            total_tokens: null
          },
          ads_analyzed: adsData.length,
          filters_applied: filters,
          created_at: new Date().toISOString(),
          mock_analysis: true
        }
      };

      // Calculate total tokens
      result.metadata.tokens_used.total_tokens = 
        result.metadata.tokens_used.input_tokens + result.metadata.tokens_used.output_tokens;

      logger.info('Mock analysis completed', {
        tokensUsed: result.metadata.tokens_used,
        analysisLength: result.analysis.length
      });

      return result;

    } catch (error) {
      logger.error('Mock analysis failed:', error);
      throw new Error(`Mock analysis error: ${error.message}`);
    }
  }

  generateAnalysis(prompt, adsData, filters) {
    const advertisers = [...new Set(adsData.map(ad => ad.advertiser?.page_name).filter(Boolean))];
    const totalAds = adsData.length;
    const adsWithVideo = adsData.filter(ad => ad.creative?.has_video).length;
    const avgImpressions = Math.floor(adsData.reduce((sum, ad) => sum + (ad.metrics?.impressions_min || 0), 0) / totalAds);

    // Generate context-aware analysis based on the prompt
    const analysisType = this.detectAnalysisType(prompt);
    
    return `# AI Analysis Results

## Executive Summary
Based on analysis of ${totalAds} ads from ${advertisers.length} advertiser(s), this report provides insights into the competitive landscape and creative strategies observed in the data.

${this.generateContextualAnalysis(analysisType, prompt, adsData, advertisers)}

## Key Performance Indicators
- **Average Impressions**: ${avgImpressions.toLocaleString()}
- **Video Ad Adoption**: ${Math.round((adsWithVideo / totalAds) * 100)}% of ads include video content
- **Advertiser Diversity**: ${advertisers.length} unique brands analyzed
- **Campaign Reach**: Combined estimated reach of ${(avgImpressions * totalAds).toLocaleString()} impressions

## Strategic Recommendations

### Immediate Actions
${this.getRandomItems(this.analysisTemplates.recommendations, 3).map((rec, i) => `${i + 1}. **${rec}** - Test implementation within 2-4 weeks`).join('\n')}

### Long-term Strategies
${this.getRandomItems(this.analysisTemplates.recommendations, 2).map((rec, i) => `${i + 1}. **${rec}** - Develop over 3-6 month timeline`).join('\n')}

## Competitive Intelligence

### Market Positioning
${advertisers.slice(0, 3).map(advertiser => 
  `- **${advertiser}**: ${this.getRandomItems(this.analysisTemplates.insights, 1)[0]}`
).join('\n')}

### Creative Trends
${this.getRandomItems(this.analysisTemplates.themes, 3).map((theme, i) => 
  `${i + 1}. **${theme}**: Observed in ${Math.floor(Math.random() * 40) + 20}% of analyzed ads`
).join('\n')}

## Analysis Methodology
This analysis used advanced pattern recognition to identify:
- Messaging themes and emotional appeals
- Visual design consistency and trends  
- Performance correlation patterns
- Competitive positioning strategies
- Target audience alignment indicators

${filters && Object.keys(filters).length > 0 ? `\n## Applied Filters\n${Object.entries(filters).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}` : ''}

---
*Generated by Mock AI Analysis Engine • ${new Date().toLocaleDateString()} • Based on ${totalAds} competitive ad samples*`;
  }

  detectAnalysisType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('theme') || lowerPrompt.includes('messaging')) return 'themes';
    if (lowerPrompt.includes('video') || lowerPrompt.includes('transcript')) return 'video';
    if (lowerPrompt.includes('competitor') || lowerPrompt.includes('positioning')) return 'competitive';
    if (lowerPrompt.includes('creative') || lowerPrompt.includes('design')) return 'creative';
    if (lowerPrompt.includes('audience') || lowerPrompt.includes('target')) return 'audience';
    if (lowerPrompt.includes('performance') || lowerPrompt.includes('metrics')) return 'performance';
    
    return 'general';
  }

  generateContextualAnalysis(type, prompt, adsData, advertisers) {
    const contextualResponses = {
      themes: `## Messaging Themes Analysis

The analysis reveals several dominant messaging strategies across the ${adsData.length} ads examined:

### Primary Themes Identified
${this.getRandomItems(this.analysisTemplates.themes, 4).map((theme, i) => 
  `${i + 1}. **${theme}** - Appears in ${Math.floor(Math.random() * 30) + 15}% of ads`
).join('\n')}

### Brand Voice Consistency
${advertisers.slice(0, 2).map(brand => 
  `- **${brand}**: Maintains consistent ${this.getRandomItems(['aspirational', 'authentic', 'premium', 'accessible', 'innovative'], 1)} brand voice`
).join('\n')}`,

      video: `## Video Content Analysis

Video adoption and content strategy insights:

### Video Usage Statistics
- **${Math.floor(Math.random() * 40) + 30}%** of ads include video content
- Average video length: **${Math.floor(Math.random() * 20) + 15} seconds**
- Most common format: **Square (1:1) aspect ratio**

### Content Patterns
${this.getRandomItems([
  'Product demonstrations dominate video content',
  'Lifestyle scenarios outperform direct product shots',
  'User-generated content shows higher engagement',
  'Animation and motion graphics increasingly popular'
], 3).map((pattern, i) => `${i + 1}. ${pattern}`).join('\n')}`,

      competitive: `## Competitive Positioning Analysis

Market positioning and differentiation strategies observed:

### Competitive Landscape
${advertisers.map(brand => 
  `- **${brand}**: ${this.getRandomItems([
    'Premium positioning with quality-focused messaging',
    'Value-driven approach emphasizing accessibility',
    'Innovation leadership through technology focus',
    'Community-building through lifestyle alignment'
  ], 1)[0]}`
).join('\n')}

### Differentiation Strategies
${this.getRandomItems(this.analysisTemplates.insights, 3).map((insight, i) => `${i + 1}. ${insight}`).join('\n')}`,

      general: `## Comprehensive Analysis Overview

This analysis examines competitive advertising strategies across multiple dimensions:

### Overall Trends
${this.getRandomItems(this.analysisTemplates.insights, 4).map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

### Cross-Platform Insights
- **Consistent messaging** across Facebook and Instagram placements
- **Platform-specific optimizations** in creative formats
- **Audience targeting** varies by platform demographics`
    };

    return contextualResponses[type] || contextualResponses.general;
  }

  getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async testConnection() {
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Mock AI Analysis Engine connected successfully',
        model: 'mock-claude-opus',
        mock_service: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        mock_service: true
      };
    }
  }
}

module.exports = MockAnalysisService;
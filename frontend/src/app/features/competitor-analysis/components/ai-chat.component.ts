import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, Input } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface AnalysisResults {
  workflow_id: string;
  analysis: {
    summary: {
      your_page: {
        page_name: string;
        total_ads: number;
        performance_score: number;
      };
      competitors: Array<{
        page_name: string;
        total_ads: number;
        performance_score: number;
      }>;
    };
    insights: string[];
    recommendations: string[];
    analyzed_at: string;
    ai_provider: string;
  };
  credits_used: number;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @Input() analysisResults: AnalysisResults | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage = '';
  isTyping = false;
  isSending = false;
  isOnline = true;

  quickQuestions = [
    'Why is my performance score lower?',
    'What creative strategies should I use?',
    'How can I improve my campaigns?',
    'What are the key differences?'
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Check AI service availability
    this.checkAIAvailability();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      // Handle scroll error silently
    }
  }

  private checkAIAvailability(): void {
    this.apiService.testAnalysisConnection().subscribe({
      next: (response) => {
        this.isOnline = response.success;
      },
      error: () => {
        this.isOnline = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isSending) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: this.currentMessage.trim(),
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const messageText = this.currentMessage.trim();
    this.currentMessage = '';
    this.isSending = true;
    this.isTyping = true;

    // Send to AI analysis endpoint
    this.sendToAI(messageText);
  }

  sendQuickQuestion(question: string): void {
    this.currentMessage = question;
    this.sendMessage();
  }

  onEnterPressed(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private sendToAI(message: string): void {
    // Check if we have analysis results with workflow ID
    if (!this.analysisResults?.workflow_id) {
      this.addErrorMessage('Please run a competitor analysis first to start chatting with AI.');
      this.isTyping = false;
      this.isSending = false;
      return;
    }

    // Prepare conversation history
    const conversationHistory = this.messages.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp
    }));

    const chatRequest = {
      message: message,
      workflowId: this.analysisResults.workflow_id,
      conversationHistory: conversationHistory
    };

    this.apiService.sendChatMessage(chatRequest).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.isSending = false;

        if (response.success) {
          const aiMessage: ChatMessage = {
            sender: 'ai',
            text: response.data.response,
            timestamp: new Date()
          };
          this.messages.push(aiMessage);
        } else {
          this.addErrorMessage('Sorry, I encountered an error processing your question.');
        }
      },
      error: (error) => {
        console.error('AI chat error:', error);
        this.isTyping = false;
        this.isSending = false;
        
        // Provide mock response for development
        this.provideMockResponse(message);
      }
    });
  }

  private createContextualPrompt(userMessage: string): string {
    let contextPrompt = `You are an AI assistant helping with Facebook advertising competitive analysis. `;
    
    if (this.analysisResults) {
      contextPrompt += `Here's the current analysis context:

YOUR BRAND: ${this.analysisResults.analysis.summary.your_page.page_name}
- Total Ads: ${this.analysisResults.analysis.summary.your_page.total_ads}
- Performance Score: ${this.analysisResults.analysis.summary.your_page.performance_score}

COMPETITORS:
${this.analysisResults.analysis.summary.competitors.map((comp, index) => 
  `${index + 1}. ${comp.page_name} - ${comp.total_ads} ads (Score: ${comp.performance_score})`
).join('\n')}

CURRENT INSIGHTS:
${this.analysisResults.analysis.insights.map((insight, index) => `${index + 1}. ${insight}`).join('\n')}

CURRENT RECOMMENDATIONS:
${this.analysisResults.analysis.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

`;
    }

    contextPrompt += `User Question: ${userMessage}

Please provide a helpful, specific answer about Facebook advertising strategy and competitive analysis. Keep your response conversational but informative.`;

    return contextPrompt;
  }

  private provideMockResponse(userMessage: string): void {
    setTimeout(() => {
      this.isTyping = false;
      this.isSending = false;

      let response = '';

      // Generate contextual mock responses
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('performance') || lowerMessage.includes('score')) {
        response = `Based on your analysis results, your performance score might be lower due to several factors:

<strong>Key factors affecting performance:</strong>
• Ad frequency and consistency - competitors may be running more campaigns
• Creative variety - video content and engaging visuals tend to perform better  
• Targeting optimization - competitors might have more refined audience targeting
• Budget allocation - higher ad spend can improve reach and engagement

<strong>Quick wins to improve:</strong>
• Increase video content in your ad creatives
• Test different messaging approaches
• Analyze your competitors' most engaging ads
• Consider expanding your advertising budget`;

      } else if (lowerMessage.includes('creative') || lowerMessage.includes('strategy')) {
        response = `Here are some creative strategies based on competitive analysis:

<strong>Content recommendations:</strong>
• Focus on video content - it typically has 2-3x higher engagement
• Use user-generated content and testimonials
• Test seasonal and trending topics
• Create mobile-first creative formats

<strong>Messaging strategies:</strong>
• Analyze your competitors' top-performing ad copy
• Test emotional vs. rational messaging approaches
• Use clear, action-oriented call-to-actions
• Personalize content for different audience segments`;

      } else if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
        response = `To improve your campaign performance:

<strong>Immediate actions:</strong>
• Increase your ad volume to match competitor activity
• A/B test different creative formats
• Optimize your targeting based on competitor insights
• Set up proper conversion tracking

<strong>Long-term strategy:</strong>
• Develop a content calendar for consistent posting
• Build a library of high-performing creative assets
• Monitor competitor campaigns regularly
• Invest in video production capabilities`;

      } else {
        response = `Great question! Based on your competitor analysis, here are some key insights:

<strong>Current competitive landscape:</strong>
• Your competitors are running more active campaigns
• Video content appears to be a major differentiator
• Performance scores vary significantly across brands

<strong>Opportunities for improvement:</strong>
• Increase advertising frequency and consistency
• Diversify your creative formats
• Study competitor messaging and positioning
• Test new audience targeting approaches

Would you like me to elaborate on any of these points?`;
      }

      const aiMessage: ChatMessage = {
        sender: 'ai',
        text: response,
        timestamp: new Date()
      };

      this.messages.push(aiMessage);
    }, 1500 + Math.random() * 1000); // Random delay for realistic typing simulation
  }

  private addErrorMessage(errorText: string): void {
    const errorMessage: ChatMessage = {
      sender: 'ai', 
      text: errorText,
      timestamp: new Date()
    };
    this.messages.push(errorMessage);
  }

  formatMessage(text: string): string {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• /g, '• ')
      .replace(/\n/g, '<br>');
  }

  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getTotalAds(): number {
    if (!this.analysisResults) return 0;
    
    const yourAds = this.analysisResults.analysis.summary.your_page.total_ads;
    const competitorAds = this.analysisResults.analysis.summary.competitors.reduce(
      (sum, comp) => sum + comp.total_ads, 0
    );
    
    return yourAds + competitorAds;
  }

  getCompetitorNames(): string {
    if (!this.analysisResults?.analysis?.summary?.competitors) return '';
    
    return this.analysisResults.analysis.summary.competitors
      .map(c => c.page_name)
      .join(', ');
  }
}
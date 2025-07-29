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
    real_ads_data?: any[]; // Real ad data extracted from scraped results
    brands_analyzed?: string[]; // List of analyzed brand names
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
    // Prepare conversation history
    const conversationHistory = this.messages.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp
    }));

    // Prepare chat request - support both contextual and general modes
    const chatRequest: any = {
      message: message,
      conversationHistory: conversationHistory
    };

    // Priority 1: Include real ad data for contextual analysis (preferred approach)
    if (this.analysisResults?.analysis?.real_ads_data) {
      chatRequest.adsData = this.analysisResults.analysis.real_ads_data;
      chatRequest.brandsAnalyzed = this.analysisResults.analysis.brands_analyzed;
      console.log('Including real ad data in chat request:', {
        adsCount: chatRequest.adsData.length,
        brands: chatRequest.brandsAnalyzed
      });
    }
    // Priority 2: Add workflow context if available and no real ads data (fallback)
    // Skip mock/test workflows as they don't exist in the real system
    else if (this.analysisResults?.workflow_id && 
             this.analysisResults.workflow_id.trim() &&
             this.analysisResults.analysis?.ai_provider !== 'enhanced_mock' &&
             this.analysisResults.analysis?.ai_provider !== 'mock') {
      chatRequest.workflowId = this.analysisResults!.workflow_id;
    }
    // Otherwise use general mode (no workflow context required)
    // Explicitly set workflowId to undefined if not available
    if (!chatRequest.workflowId) {
      delete chatRequest.workflowId;
    }

    // Debug logging
    console.log('Chat request payload:', JSON.stringify(chatRequest, null, 2));
    console.log('Analysis results:', this.analysisResults);

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
        
        // Show actual error message instead of mock response
        let errorMessage = 'Sorry, I encountered an error processing your question.';
        if (error.error?.error?.message) {
          errorMessage = `Error: ${error.error.error.message}`;
        } else if (error.status === 404) {
          errorMessage = 'AI service is currently unavailable. Please try again later.';
        }
        
        this.addErrorMessage(errorMessage);
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
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';

interface AnalysisFilter {
  platform?: string;
  advertiser?: string;
  query?: string;
  date_from?: string;
  date_to?: string;
}

interface AnalysisResult {
  analysis: string;
  metadata: any;
  data_summary: {
    ads_analyzed: number;
    filters_applied: AnalysisFilter;
    analysis_date: string;
  };
}

@Component({
  selector: 'ads-analysis',
  template: `
    <div class="analysis-container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <mat-icon>psychology</mat-icon>
            <span>AI-Powered Analysis</span>
          </div>
          <h1>AI Analysis with Claude Opus</h1>
          <p>Transform your scraped ad data into actionable competitive intelligence with advanced AI analysis</p>
        </div>
        <div class="hero-visual">
          <div class="floating-card">
            <mat-icon>insights</mat-icon>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content-grid">
        <!-- Analysis Form -->
        <div class="form-section">
          <mat-card class="analysis-form-card">
            <div class="card-header">
              <h2>Custom Analysis Prompt</h2>
              <p>Ask Claude Opus specific questions about your competitive ad data</p>
            </div>
            <mat-card-content>
          <!-- Prompt Input -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Analysis Question</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="analysisPrompt" 
              placeholder="e.g., What are the common themes in Nike's recent ads? What creative strategies are competitors using?"
              rows="4"
              [disabled]="isAnalyzing">
            </textarea>
            <mat-hint>Ask specific questions about trends, strategies, themes, or performance patterns</mat-hint>
          </mat-form-field>

          <!-- Data Filters -->
          <div class="filters-section">
            <h3>Data Filters (Optional)</h3>
            <div class="filters-grid">
              <mat-form-field appearance="outline">
                <mat-label>Platform</mat-label>
                <mat-select [(ngModel)]="filters.platform">
                  <mat-option value="">All Platforms</mat-option>
                  <mat-option value="facebook">Facebook</mat-option>
                  <mat-option value="instagram">Instagram</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Advertiser</mat-label>
                <input matInput [(ngModel)]="filters.advertiser" placeholder="e.g., Nike, Apple">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Search Query</mat-label>
                <input matInput [(ngModel)]="filters.query" placeholder="Original search term">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>From Date</mat-label>
                <input matInput type="date" [(ngModel)]="filters.date_from">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>To Date</mat-label>
                <input matInput type="date" [(ngModel)]="filters.date_to">
              </mat-form-field>

              <mat-checkbox [(ngModel)]="includeVideoTranscripts" class="video-checkbox">
                Include Video Transcripts
              </mat-checkbox>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button 
              mat-raised-button 
              color="primary" 
              (click)="startAnalysis()"
              [disabled]="!analysisPrompt.trim() || isAnalyzing">
              <mat-icon>psychology</mat-icon>
              {{ isAnalyzing ? 'Analyzing...' : 'Analyze with Claude Opus' }}
            </button>

            <button 
              mat-button 
              (click)="clearForm()"
              [disabled]="isAnalyzing">
              Clear
            </button>

            <button 
              mat-button 
              (click)="testConnection()"
              [disabled]="isAnalyzing">
              Test Claude Connection
            </button>

            <button 
              mat-button 
              (click)="testVideoService()"
              [disabled]="isAnalyzing">
              Test Video Service
            </button>
          </div>

          <!-- Loading Indicator -->
          <div *ngIf="isAnalyzing" class="loading-section">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <p class="loading-text">Claude Opus is analyzing your data... This may take 30-60 seconds.</p>
          </div>
        </mat-card-content>
      </mat-card>

        </div>

        <!-- Analysis Results -->
        <mat-card *ngIf="analysisResult" class="results-card">
          <mat-card-header>
            <mat-card-title>Analysis Results</mat-card-title>
            <mat-card-subtitle>
              Analyzed {{ analysisResult.data_summary.ads_analyzed }} ads • 
              {{ analysisResult.data_summary.analysis_date | date:'short' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="analysis-content" [innerHTML]="formatAnalysis(analysisResult.analysis)"></div>
            
            <!-- Metadata -->
            <mat-expansion-panel class="metadata-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>Analysis Details</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="metadata-content">
                <p><strong>Model:</strong> {{ analysisResult.metadata.model }}</p>
                <p><strong>Tokens Used:</strong> {{ analysisResult.metadata.tokens_used?.total_tokens || 'N/A' }}</p>
                <p><strong>Ads Analyzed:</strong> {{ analysisResult.data_summary.ads_analyzed }}</p>
                <p><strong>Video Analysis:</strong> {{ getVideoAnalysisStats() }}</p>
                <p><strong>Filters Applied:</strong></p>
                <pre>{{ analysisResult.data_summary.filters_applied | json }}</pre>
              </div>
            </mat-expansion-panel>

            <!-- Export Options -->
            <div class="export-actions">
              <button mat-button color="accent" (click)="exportAnalysis()">
                <mat-icon>download</mat-icon>
                Export Analysis
              </button>
              <button mat-button (click)="shareAnalysis()">
                <mat-icon>share</mat-icon>
                Share
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Example Prompts -->
        <mat-card class="examples-card">
          <mat-card-header>
            <mat-card-title>Example Analysis Prompts</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="example-prompts">
              <mat-chip-set>
                <mat-chip 
                  *ngFor="let example of examplePrompts" 
                  (click)="useExamplePrompt(example)"
                  [disabled]="isAnalyzing">
                  {{ example.title }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .analysis-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 0;
    }

    /* Hero Section */
    .hero-section {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
      color: white;
      padding: 4rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="0.5" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
      opacity: 0.3;
    }

    .hero-content {
      position: relative;
      z-index: 2;
      max-width: 800px;
      margin: 0 auto;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 25px;
      padding: 0.5rem 1rem;
      margin-bottom: 2rem;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .hero-badge mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .hero-section h1 {
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(45deg, #ffffff, #e0e7ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-section p {
      font-size: 1.2rem;
      opacity: 0.9;
      line-height: 1.6;
      margin-bottom: 0;
    }

    .hero-visual {
      position: absolute;
      top: 50%;
      right: 2rem;
      transform: translateY(-50%);
      display: none;
    }

    @media (min-width: 1200px) {
      .hero-visual {
        display: block;
      }
    }

    .floating-card {
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: float 6s ease-in-out infinite;
    }

    .floating-card mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: rgba(255, 255, 255, 0.8);
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    /* Main Content */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      padding: 3rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
      background: #f8fafc;
      position: relative;
    }

    .form-section {
      grid-column: 1;
    }

    /* Card Styling */
    .analysis-form-card {
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      border: none;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
    }

    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .card-header h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .card-header p {
      margin: 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    mat-card-content {
      padding: 2rem !important;
    }

    /* Form Styling */
    .full-width {
      width: 100%;
      margin-bottom: 1.5rem;
    }

    .full-width .mat-mdc-form-field {
      width: 100%;
    }

    .filters-section {
      margin: 2rem 0;
      padding: 1.5rem;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(102, 126, 234, 0.1);
    }

    .filters-section h3 {
      margin: 0 0 1.5rem 0;
      color: #4c51bf;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      align-items: start;
    }

    .video-checkbox {
      grid-column: 1 / -1;
      margin-top: 1rem;
      color: #4c51bf;
      font-weight: 500;
    }

    /* Action Buttons */
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 2rem;
      justify-content: center;
    }

    .action-buttons button {
      border-radius: 25px;
      padding: 0.75rem 2rem;
      font-weight: 600;
      text-transform: none;
      font-size: 1rem;
    }

    .action-buttons .mat-mdc-raised-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      transform: translateY(0);
      transition: all 0.3s ease;
    }

    .action-buttons .mat-mdc-raised-button:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
    }

    /* Loading */
    .loading-section {
      margin-top: 2rem;
      text-align: center;
    }

    .loading-text {
      color: #6b7280;
      margin-top: 1rem;
      font-weight: 500;
    }

    /* Results */
    .results-card {
      margin-top: 2rem;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      border: none;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
    }

    .analysis-content {
      line-height: 1.7;
      color: #374151;
      font-size: 1rem;
    }

    .analysis-content h1,
    .analysis-content h2,
    .analysis-content h3 {
      color: #1f2937;
      margin-top: 2rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .analysis-content ul {
      margin-left: 1.5rem;
    }

    .analysis-content blockquote {
      border-left: 4px solid #667eea;
      padding-left: 1rem;
      margin: 1rem 0;
      font-style: italic;
      background: rgba(102, 126, 234, 0.05);
      padding: 1rem;
      border-radius: 8px;
    }

    /* Examples */
    .examples-card {
      margin-top: 2rem;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      border: none;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
    }

    .example-prompts mat-chip {
      margin: 0.25rem;
      cursor: pointer;
      border-radius: 20px;
      background: rgba(102, 126, 234, 0.1);
      color: #4c51bf;
      border: 1px solid rgba(102, 126, 234, 0.2);
      transition: all 0.3s ease;
    }

    .example-prompts mat-chip:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: translateY(-1px);
    }

    /* Metadata and Export */
    .metadata-panel {
      margin: 2rem 0;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    .export-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
      justify-content: center;
    }

    .export-actions button {
      border-radius: 25px;
      padding: 0.5rem 1.5rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero-section {
        padding: 3rem 1rem;
      }
      
      .hero-section h1 {
        font-size: 2.5rem;
      }
      
      .content-grid {
        padding: 2rem 1rem;
      }
      
      .action-buttons {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class AnalysisComponent implements OnInit {
  analysisPrompt: string = '';
  filters: AnalysisFilter = {};
  isAnalyzing: boolean = false;
  analysisResult: AnalysisResult | null = null;
  includeVideoTranscripts: boolean = true;

  examplePrompts = [
    {
      title: 'Common Themes Analysis',
      prompt: 'What are the most common themes and messaging strategies in these ads? Identify patterns in tone, benefits highlighted, and emotional appeals used.'
    },
    {
      title: 'Competitive Positioning',
      prompt: 'How are different brands positioning themselves against competitors? What unique value propositions and differentiators are being emphasized?'
    },
    {
      title: 'Creative Strategy Trends',
      prompt: 'What creative formats, visual styles, and design trends are most prevalent? Are there seasonal or temporal patterns in the creative approach?'
    },
    {
      title: 'Call-to-Action Analysis',
      prompt: 'What types of calls-to-action are being used most frequently? How do they vary by brand, product type, or campaign objective?'
    },
    {
      title: 'Target Audience Insights',
      prompt: 'Based on the ad copy and creative elements, what target audiences do these ads appear to be designed for? What demographic or psychographic segments are being addressed?'
    },
    {
      title: 'Video Content Analysis',
      prompt: 'Analyze the video content and transcripts. What storytelling techniques, pacing, and audio messaging strategies are being used? How do video elements complement the text and visual components?'
    },
    {
      title: 'Multi-Media Consistency',
      prompt: 'How consistent is the messaging across text, images, and video content? Are there any disconnects or particularly strong alignment between different creative elements?'
    }
  ];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    // Test API connection on component load
    this.testApiConnection();
  }

  private testApiConnection() {
    this.apiService.testAnalysisConnection().subscribe({
      next: (response) => {
        console.log('API connection successful:', response);
      },
      error: (error) => {
        console.error('API connection failed:', error);
        this.snackBar.open('Warning: Could not connect to API server', 'Close', { duration: 5000 });
      }
    });
  }

  startAnalysis() {
    if (!this.analysisPrompt.trim()) {
      this.snackBar.open('Please enter an analysis prompt', 'Close', { duration: 3000 });
      return;
    }

    this.isAnalyzing = true;
    this.analysisResult = null;

    const payload = {
      prompt: this.analysisPrompt,
      filters: this.filters
    };

    this.apiService.startAnalysis(payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.analysisResult = response.data;
          this.snackBar.open('Analysis completed successfully!', 'Close', { duration: 3000 });
        } else {
          throw new Error(response.error?.message || 'Analysis failed');
        }
        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('Analysis error:', error);
        this.snackBar.open(
          error.error?.error?.message || 'Analysis failed. Please try again.', 
          'Close', 
          { duration: 5000 }
        );
        this.isAnalyzing = false;
      }
    });
  }

  testConnection() {
    this.apiService.testAnalysisConnection().subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Claude connection successful!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Connection failed: ' + response.data.error, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Connection test error:', error);
        this.snackBar.open('Connection test failed', 'Close', { duration: 3000 });
      }
    });
  }

  testVideoService() {
    this.apiService.testVideoService().subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Video transcription service connected!', 'Close', { duration: 3000 });
        } else {
          this.snackBar.open('Video service failed: ' + response.data.error, 'Close', { duration: 5000 });
        }
      },
      error: (error) => {
        console.error('Video service test error:', error);
        this.snackBar.open('Video service test failed', 'Close', { duration: 3000 });
      }
    });
  }

  clearForm() {
    this.analysisPrompt = '';
    this.filters = {};
    this.analysisResult = null;
    this.includeVideoTranscripts = true;
  }

  useExamplePrompt(example: any) {
    this.analysisPrompt = example.prompt;
  }

  getVideoAnalysisStats(): string {
    if (!this.analysisResult?.data_summary) return 'No data available';
    
    // This would need to be added to the API response
    // For now, return a placeholder message
    return 'Video transcription analysis included';
  }

  formatAnalysis(analysis: string): string {
    // Convert markdown-like formatting to HTML
    return analysis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
  }

  exportAnalysis() {
    if (!this.analysisResult) return;

    const exportData = {
      prompt: this.analysisPrompt,
      filters: this.filters,
      analysis: this.analysisResult.analysis,
      metadata: this.analysisResult.metadata,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Analysis exported successfully!', 'Close', { duration: 3000 });
  }

  shareAnalysis() {
    if (!this.analysisResult) return;

    const shareText = `AI Analysis Results:\n\nPrompt: ${this.analysisPrompt}\n\nAnalysis:\n${this.analysisResult.analysis}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'AI Ad Analysis Results',
        text: shareText
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        this.snackBar.open('Analysis copied to clipboard!', 'Close', { duration: 3000 });
      });
    }
  }
}
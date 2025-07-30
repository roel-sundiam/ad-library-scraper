import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

interface ExportOptions {
  formats: string[];
  availableBrands: string[];
  availableAnalysisTypes: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
  limits: {
    maxResults: number;
    maxFileSize: string;
  };
}

@Component({
  selector: 'ads-export',
  template: `
    <div class="page-container">
      <h1>Export Data</h1>
      
      <!-- Export Analysis Results -->
      <mat-card class="export-section">
        <mat-card-header>
          <mat-card-title>Export Analysis Results with Transcripts</mat-card-title>
          <mat-card-subtitle>Download complete analysis data including video transcripts and AI insights</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="export-form">
            <div class="form-row">
              <mat-form-field>
                <mat-label>Date From</mat-label>
                <input matInput type="date" [(ngModel)]="analysisFilters.dateFrom" 
                       [min]="exportOptions?.dateRange.earliest" 
                       [max]="exportOptions?.dateRange.latest">
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Date To</mat-label>
                <input matInput type="date" [(ngModel)]="analysisFilters.dateTo"
                       [min]="exportOptions?.dateRange.earliest" 
                       [max]="exportOptions?.dateRange.latest">
              </mat-form-field>
            </div>
            
            <div class="form-row">
              <mat-form-field>
                <mat-label>Brand/Advertiser</mat-label>
                <mat-select [(ngModel)]="analysisFilters.brand">
                  <mat-option value="">All Brands</mat-option>
                  <mat-option *ngFor="let brand of exportOptions?.availableBrands" [value]="brand">
                    {{brand}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Analysis Type</mat-label>
                <mat-select [(ngModel)]="analysisFilters.analysisType">
                  <mat-option value="">All Types</mat-option>
                  <mat-option *ngFor="let type of exportOptions?.availableAnalysisTypes" [value]="type">
                    {{type | titlecase}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            
            <div class="form-row">
              <mat-checkbox [(ngModel)]="analysisFilters.includeTranscripts">
                Include transcript data in export
              </mat-checkbox>
            </div>
            
            <div class="export-actions">
              <button mat-raised-button color="primary" 
                      (click)="exportAnalysisResults()" 
                      [disabled]="isExporting">
                <mat-icon>download</mat-icon>
                {{ isExporting ? 'Exporting...' : 'Export Analysis Results' }}
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      
      <!-- Export Transcripts Only -->
      <mat-card class="export-section">
        <mat-card-header>
          <mat-card-title>Export Transcripts Only</mat-card-title>
          <mat-card-subtitle>Download video transcripts with AI analysis insights</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="export-form">
            <div class="form-row">
              <mat-form-field>
                <mat-label>Date From</mat-label>
                <input matInput type="date" [(ngModel)]="transcriptFilters.dateFrom"
                       [min]="exportOptions?.dateRange.earliest" 
                       [max]="exportOptions?.dateRange.latest">
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Date To</mat-label>
                <input matInput type="date" [(ngModel)]="transcriptFilters.dateTo"
                       [min]="exportOptions?.dateRange.earliest" 
                       [max]="exportOptions?.dateRange.latest">
              </mat-form-field>
            </div>
            
            <div class="form-row">
              <mat-form-field>
                <mat-label>Brand/Advertiser</mat-label>
                <mat-select [(ngModel)]="transcriptFilters.brand">
                  <mat-option value="">All Brands</mat-option>
                  <mat-option *ngFor="let brand of exportOptions?.availableBrands" [value]="brand">
                    {{brand}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            
            <div class="export-actions">
              <button mat-raised-button color="accent" 
                      (click)="exportTranscripts()" 
                      [disabled]="isExporting">
                <mat-icon>subtitles</mat-icon>
                {{ isExporting ? 'Exporting...' : 'Export Transcripts' }}
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      
      <!-- Export Info -->
      <mat-card class="export-section">
        <mat-card-header>
          <mat-card-title>Export Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="export-info">
            <h3>What's included in exports:</h3>
            <div class="info-grid">
              <div class="info-item">
                <h4>Analysis Results Export:</h4>
                <ul>
                  <li>Video metadata (URL, platform, ad ID, advertiser)</li>
                  <li>Complete transcript with timestamps</li>
                  <li>AI analysis responses and insights</li>
                  <li>Marketing strategy recommendations</li>
                  <li>Competitive analysis findings</li>
                  <li>Sentiment analysis results</li>
                </ul>
              </div>
              
              <div class="info-item">
                <h4>Transcript Export:</h4>
                <ul>
                  <li>Full transcript text with confidence scores</li>
                  <li>Segmented transcript with timestamps</li>
                  <li>AI-generated insights from transcript analysis</li>
                  <li>Key messaging and marketing tactics identified</li>
                  <li>Target audience analysis</li>
                </ul>
              </div>
              
              <div class="info-item">
                <h4>Technical Details:</h4>
                <ul>
                  <li>Format: JSON (structured data)</li>
                  <li>Transcription: OpenAI Whisper-1 model</li>
                  <li>Analysis: GPT-3.5-turbo & GPT-4 models</li>
                  <li>Max file size: {{exportOptions?.limits.maxFileSize || 'Loading...'}}</li>
                  <li>Max results: {{exportOptions?.limits.maxResults || 'Loading...'}}</li>
                </ul>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
      
      <!-- Loading/Error States -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading export options...</p>
      </div>
      
      <div *ngIf="error" class="error-container">
        <mat-icon color="warn">error</mat-icon>
        <p>{{error}}</p>
        <button mat-button (click)="loadExportOptions()">Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1 {
      margin-bottom: 2rem;
      color: #333;
      text-align: center;
    }
    
    .export-section {
      margin-bottom: 2rem;
    }
    
    .export-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .form-row mat-form-field {
      flex: 1;
      min-width: 200px;
    }
    
    .export-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .export-actions button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .export-info {
      margin-top: 1rem;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 1rem;
    }
    
    .info-item h4 {
      color: #1976d2;
      margin-bottom: 0.5rem;
    }
    
    .info-item ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    .info-item li {
      margin-bottom: 0.25rem;
      line-height: 1.4;
    }
    
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      text-align: center;
    }
    
    .error-container mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 1rem;
    }
    
    @media (max-width: 768px) {
      .page-container {
        padding: 1rem;
      }
      
      .form-row {
        flex-direction: column;
      }
      
      .form-row mat-form-field {
        width: 100%;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ExportComponent implements OnInit {
  exportOptions: ExportOptions | null = null;
  isLoading = false;
  isExporting = false;
  error: string | null = null;
  
  // Filter options for analysis results export
  analysisFilters = {
    dateFrom: '',
    dateTo: '',
    brand: '',
    analysisType: '',
    includeTranscripts: true
  };
  
  // Filter options for transcript export
  transcriptFilters = {
    dateFrom: '',
    dateTo: '',
    brand: ''
  };
  
  constructor(private apiService: ApiService) {}
  
  ngOnInit() {
    this.loadExportOptions();
  }
  
  loadExportOptions() {
    this.isLoading = true;
    this.error = null;
    
    this.apiService.get('/export/options').subscribe({
      next: (response) => {
        if (response.success) {
          this.exportOptions = response.data;
        } else {
          this.error = 'Failed to load export options';
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.error?.error?.message || 'Failed to load export options';
        this.isLoading = false;
      }
    });
  }
  
  exportAnalysisResults() {
    this.isExporting = true;
    
    const params = {
      format: 'json',
      includeTranscripts: this.analysisFilters.includeTranscripts.toString(),
      ...(this.analysisFilters.dateFrom && { dateFrom: this.analysisFilters.dateFrom }),
      ...(this.analysisFilters.dateTo && { dateTo: this.analysisFilters.dateTo }),
      ...(this.analysisFilters.brand && { brand: this.analysisFilters.brand }),
      ...(this.analysisFilters.analysisType && { analysisType: this.analysisFilters.analysisType })
    };
    
    this.apiService.get('/export/analysis-results', { params }).subscribe({
      next: (response) => {
        if (response.success) {
          this.downloadFile(response.data, 'analysis-results');
        }
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.error = error.error?.error?.message || 'Export failed';
        this.isExporting = false;
      }
    });
  }
  
  exportTranscripts() {
    this.isExporting = true;
    
    const params = {
      format: 'json',
      ...(this.transcriptFilters.dateFrom && { dateFrom: this.transcriptFilters.dateFrom }),
      ...(this.transcriptFilters.dateTo && { dateTo: this.transcriptFilters.dateTo }),
      ...(this.transcriptFilters.brand && { brand: this.transcriptFilters.brand })
    };
    
    this.apiService.get('/export/transcripts', { params }).subscribe({
      next: (response) => {
        if (response.success) {
          this.downloadFile(response.data, 'transcripts');
        }
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.error = error.error?.error?.message || 'Export failed';
        this.isExporting = false;
      }
    });
  }
  
  private downloadFile(data: any, type: string) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }
}
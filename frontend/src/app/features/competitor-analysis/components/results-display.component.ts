import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { FacebookAnalysisResults } from '../../../shared/models/facebook-ads.interface';

// Legacy interface for backwards compatibility
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
  pages: {
    your_page: any;
    competitor_1: any;
    competitor_2: any;
  };
  completed_at: string;
  credits_used: number;
}

@Component({
  selector: 'app-results-display',
  templateUrl: './results-display.component.html',
  styleUrls: ['./results-display.component.scss']
})
export class ResultsDisplayComponent implements OnInit {
  runId: string = '';
  results: AnalysisResults | null = null;
  facebookResults: FacebookAnalysisResults | null = null;
  isLoading = true;
  errorMessage = '';
  isNewApi = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Get ID from route parameters (supports both workflowId and runId)
    this.runId = this.route.snapshot.params['workflowId'] || this.route.snapshot.params['runId'];
    if (this.runId) {
      this.loadResults();
    } else {
      this.errorMessage = 'Invalid analysis ID';
      this.isLoading = false;
    }
  }

  private loadResults(): void {
    // First try the new Facebook Analysis API
    this.apiService.getAnalysisResults(this.runId).subscribe({
      next: (response: FacebookAnalysisResults) => {
        this.isLoading = false;
        if (response.success) {
          this.facebookResults = response;
          this.isNewApi = true;
          console.log('Loaded Facebook Analysis results:', response);
        } else {
          this.tryLegacyApi();
        }
      },
      error: (error) => {
        console.log('New API failed, trying legacy API:', error);
        this.tryLegacyApi();
      }
    });
  }

  private tryLegacyApi(): void {
    // Fallback to old workflow API
    this.apiService.getWorkflowResults(this.runId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.results = response.data;
          this.isNewApi = false;
        } else {
          this.errorMessage = 'Failed to load results from both APIs';
        }
      },
      error: (error) => {
        console.error('Both APIs failed:', error);
        this.errorMessage = 'Analysis results not found. The analysis may still be in progress or may have expired.';
        this.isLoading = false;
        
        // Suggest checking progress
        setTimeout(() => {
          if (confirm('Would you like to check the analysis progress instead?')) {
            this.router.navigate(['/competitor-analysis/progress', this.runId]);
          }
        }, 2000);
      }
    });
  }

  startNewAnalysis(): void {
    this.router.navigate(['/competitor-analysis']);
  }

  downloadResults(): void {
    if (this.results) {
      const dataStr = JSON.stringify(this.results, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `competitor-analysis-${this.runId}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getTopPerformer(): { name: string; score: number } {
    if (!this.results?.analysis.summary) return { name: 'Unknown', score: 0 };
    
    const yourPage = this.results.analysis.summary.your_page;
    const competitors = this.results.analysis.summary.competitors;
    
    const allPages = [
      { name: yourPage.page_name, score: yourPage.performance_score },
      ...competitors.map(comp => ({ name: comp.page_name, score: comp.performance_score }))
    ];
    
    return allPages.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );
  }

  getTotalAdsAnalyzed(): number {
    if (!this.results?.analysis.summary) return 0;
    
    const yourAds = this.results.analysis.summary.your_page.total_ads;
    const competitorAds = this.results.analysis.summary.competitors.reduce(
      (sum, comp) => sum + comp.total_ads, 0
    );
    
    return yourAds + competitorAds;
  }
}
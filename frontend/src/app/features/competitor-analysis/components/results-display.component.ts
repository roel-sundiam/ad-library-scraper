import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

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
  workflowId: string = '';
  results: AnalysisResults | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.params['workflowId'];
    if (this.workflowId) {
      this.loadResults();
    } else {
      this.errorMessage = 'Invalid workflow ID';
      this.isLoading = false;
    }
  }

  private loadResults(): void {
    this.apiService.getWorkflowResults(this.workflowId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.results = response.data;
        } else {
          this.errorMessage = 'Failed to load results';
        }
      },
      error: (error) => {
        console.error('Error loading results:', error);
        this.errorMessage = error.error?.error?.message || 'An error occurred while loading results';
        this.isLoading = false;
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
      
      const exportFileDefaultName = `competitor-analysis-${this.workflowId}.json`;
      
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
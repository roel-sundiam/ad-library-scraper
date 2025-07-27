import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { FacebookAnalysisStatus } from '../../../shared/models/facebook-ads.interface';

interface FacebookAnalysisStatusData {
  runId: string;
  datasetId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
    message: string;
  };
  pageUrls: string[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

@Component({
  selector: 'app-progress-dashboard',
  templateUrl: './progress-dashboard.component.html',
  styleUrls: ['./progress-dashboard.component.scss']
})
export class ProgressDashboardComponent implements OnInit, OnDestroy {
  runId: string = '';
  analysisStatus: FacebookAnalysisStatusData | null = null;
  isLoading = true;
  errorMessage = '';
  
  private statusSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Get runId from route parameters (could be workflowId for backwards compatibility)
    this.runId = this.route.snapshot.params['workflowId'] || this.route.snapshot.params['runId'];
    if (this.runId) {
      this.startStatusPolling();
    } else {
      this.errorMessage = 'Invalid analysis ID';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  private startStatusPolling(): void {
    // Poll status every 3 seconds (Facebook analysis is faster than legacy workflow)
    this.statusSubscription = interval(3000)
      .pipe(
        switchMap(() => {
          // Use the correct endpoint based on the ID format
          if (this.runId.startsWith('workflow_')) {
            return this.apiService.getWorkflowStatus(this.runId);
          } else {
            return this.apiService.getAnalysisStatus(this.runId);
          }
        }),
        takeWhile(response => {
          // Continue polling while analysis is running
          return response.success && 
                 ['queued', 'running'].includes(response.data.status);
        }, true) // Include the final emit
      )
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            // Handle different response structures for workflow vs analysis endpoints
            if (this.runId.startsWith('workflow_')) {
              // Workflow status response structure
              const workflowData = response.data;
              this.analysisStatus = {
                runId: workflowData.workflow_id,
                datasetId: workflowData.workflow_id,
                status: workflowData.status,
                progress: workflowData.progress,
                pageUrls: workflowData.pages ? [
                  workflowData.pages.your_page?.url,
                  workflowData.pages.competitor_1?.url,
                  workflowData.pages.competitor_2?.url
                ].filter(Boolean) : [],
                created_at: workflowData.created_at,
                started_at: workflowData.started_at,
                completed_at: workflowData.completed_at
              };
            } else {
              // Analysis status response structure
              this.analysisStatus = response.data;
            }
            
            // If completed, navigate to Facebook Ads dashboard after a short delay
            if (this.analysisStatus && this.analysisStatus.status === 'completed') {
              setTimeout(() => {
                // Use datasetId for results (backend expects datasetId for /results endpoint)
                const datasetId = this.analysisStatus!.datasetId || this.runId;
                this.router.navigate(['/competitor-analysis/facebook-dashboard', datasetId]);
              }, 2000);
            }
          } else {
            this.errorMessage = 'Failed to get analysis status';
          }
        },
        error: (error) => {
          console.error('Error getting analysis status:', error);
          this.errorMessage = error.error?.error?.message || 'An error occurred while checking status';
          this.isLoading = false;
        }
      });
  }

  private stopStatusPolling(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  cancelAnalysis(): void {
    // Facebook analysis is fast, but we can still navigate back
    this.router.navigate(['/competitor-analysis']);
  }

  viewRunDetails(): void {
    // Could show detailed logs or metrics
    const message = this.analysisStatus ? 
      `Analysis ID: ${this.analysisStatus.runId}\nStatus: ${this.analysisStatus.status}\nProgress: ${this.analysisStatus.progress.current}/${this.analysisStatus.progress.total}` :
      'No analysis details available';
    alert(message);
  }

  getProgressBarWidth(): string {
    return this.analysisStatus ? `${this.analysisStatus.progress.percentage}%` : '0%';
  }

  getBrandNames(): string[] {
    if (!this.analysisStatus?.pageUrls) return [];
    
    return this.analysisStatus.pageUrls.map(url => {
      // Extract brand name from Facebook URL
      const match = url.match(/facebook\.com\/([^\/\?]+)/);
      return match ? match[1] : 'Unknown Brand';
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'pending': return '⏳';
      case 'failed': return '✗';
      case 'cancelled': return '⊘';
      default: return '?';
    }
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  startNewAnalysis(): void {
    this.router.navigate(['/competitor-analysis']);
  }
}
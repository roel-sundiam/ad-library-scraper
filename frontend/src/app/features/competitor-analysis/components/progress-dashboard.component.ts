import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';

interface WorkflowStatus {
  workflow_id: string;
  status: string;
  progress: {
    current_step: number;
    total_steps: number;
    percentage: number;
    message: string;
  };
  pages: {
    your_page: { url: string; status: string };
    competitor_1: { url: string; status: string };
    competitor_2: { url: string; status: string };
  };
  analysis: {
    status: string;
  };
  created_at: string;
  started_at: string;
  completed_at?: string;
  credits_used: number;
}

@Component({
  selector: 'app-progress-dashboard',
  templateUrl: './progress-dashboard.component.html',
  styleUrls: ['./progress-dashboard.component.scss']
})
export class ProgressDashboardComponent implements OnInit, OnDestroy {
  workflowId: string = '';
  workflowStatus: WorkflowStatus | null = null;
  isLoading = true;
  errorMessage = '';
  
  private statusSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.params['workflowId'];
    if (this.workflowId) {
      this.startStatusPolling();
    } else {
      this.errorMessage = 'Invalid workflow ID';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.stopStatusPolling();
  }

  private startStatusPolling(): void {
    // Poll status every 2 seconds
    this.statusSubscription = interval(2000)
      .pipe(
        switchMap(() => this.apiService.getWorkflowStatus(this.workflowId)),
        takeWhile(response => {
          // Continue polling while workflow is running
          return response.success && 
                 ['queued', 'running'].includes(response.data.status);
        }, true) // Include the final emit
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.workflowStatus = response.data;
            
            // If completed, navigate to results after a short delay
            if (response.data.status === 'completed') {
              setTimeout(() => {
                this.router.navigate(['/competitor-analysis/results', this.workflowId]);
              }, 2000);
            }
          } else {
            this.errorMessage = 'Failed to get workflow status';
          }
        },
        error: (error) => {
          console.error('Error getting workflow status:', error);
          this.errorMessage = error.error?.error?.message || 'An error occurred';
          this.isLoading = false;
        }
      });
  }

  private stopStatusPolling(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  cancelWorkflow(): void {
    if (this.workflowId) {
      this.apiService.cancelWorkflow(this.workflowId).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/competitor-analysis']);
          } else {
            this.errorMessage = 'Failed to cancel workflow';
          }
        },
        error: (error) => {
          console.error('Error cancelling workflow:', error);
          this.errorMessage = error.error?.error?.message || 'Failed to cancel workflow';
        }
      });
    }
  }

  viewFlowRun(): void {
    // This could open a detailed view or modal
    // For now, just show an alert
    alert('Detailed flow run view coming soon!');
  }

  getProgressBarWidth(): string {
    return this.workflowStatus ? `${this.workflowStatus.progress.percentage}%` : '0%';
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
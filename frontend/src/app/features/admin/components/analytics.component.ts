import { Component, OnInit } from '@angular/core';
import { AdminService, AnalyticsData } from '../../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-analytics',
  template: `
    <div class="analytics-dashboard">
      <!-- Analytics Header -->
      <div class="analytics-header">
        <div class="header-content">
          <h2>
            <mat-icon class="section-icon">analytics</mat-icon>
            Site Analytics
          </h2>
        </div>
        
        <div class="header-controls">
          <mat-form-field appearance="outline" class="timeframe-select">
            <mat-label>Time Period</mat-label>
            <mat-select [value]="selectedTimeframe" (selectionChange)="onTimeframeChange($event.value)">
              <mat-option value="1d">Last 24 Hours</mat-option>
              <mat-option value="7d">Last 7 Days</mat-option>
              <mat-option value="30d">Last 30 Days</mat-option>
              <mat-option value="90d">Last 90 Days</mat-option>
            </mat-select>
          </mat-form-field>
          
          <button 
            mat-raised-button 
            color="primary" 
            (click)="loadAnalytics()"
            [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Analytics Content -->
      <div class="analytics-content" *ngIf="!isLoading; else loadingTemplate">
        
        <!-- Summary Statistics Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card users-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-info">
                  <div class="stat-value">{{ analyticsData?.totalStats?.total_active_users || 0 }}</div>
                  <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-icon">
                  <mat-icon>people</mat-icon>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="stat-card pageviews-card">
            <mat-card-content>
              <div class="stat-content">
                <div class="stat-info">
                  <div class="stat-value">{{ analyticsData?.totalStats?.total_page_visits || 0 }}</div>
                  <div class="stat-label">Page Views</div>
                </div>
                <div class="stat-icon">
                  <mat-icon>visibility</mat-icon>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <div class="charts-grid">
            <!-- Daily Activity Card -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>trending_up</mat-icon>
                  Daily Activity
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div *ngIf="analyticsData?.dailyStats?.length; else noDataTemplate">
                  <div class="daily-stats">
                    <div class="daily-stat" *ngFor="let stat of (analyticsData?.dailyStats || []).slice(0, 7)">
                      <div class="stat-date">{{ stat.date | date:'MMM d' }}</div>
                      <div class="stat-metrics">
                        <div class="metric">
                          <span class="metric-label">Visits:</span>
                          <span class="metric-value">{{ stat.visits }}</span>
                        </div>
                        <div class="metric">
                          <span class="metric-label">Users:</span>
                          <span class="metric-value">{{ stat.unique_users }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Top Pages Card -->
            <mat-card class="chart-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>web</mat-icon>
                  Top Pages
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div *ngIf="analyticsData?.pageStats?.length; else noDataTemplate">
                  <div class="page-stats">
                    <div class="page-stat" *ngFor="let page of (analyticsData?.pageStats || []).slice(0, 5)">
                      <div class="page-info">
                        <div class="page-name">{{ getPageDisplayName(page.page_path) }}</div>
                        <div class="page-path">{{ page.page_path }}</div>
                      </div>
                      <div class="page-metrics">
                        <span class="page-visits">{{ page.visits }} visits</span>
                        <span class="page-users">{{ page.unique_users }} users</span>
                      </div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>

        <!-- Activity Overview -->
        <mat-card class="activity-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>history</mat-icon>
              User Activity Overview
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="analyticsData?.activityStats?.length; else noActivityTemplate">
              <div class="activity-grid">
                <div class="activity-item" *ngFor="let activity of (analyticsData?.activityStats || []).slice(0, 8)">
                  <span class="activity-name">{{ getActivityDisplayName(activity.action) }}</span>
                  <mat-chip class="activity-count">{{ activity.count }}</mat-chip>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Users -->
        <mat-card class="recent-users-card" *ngIf="analyticsData?.recentUsers?.length">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>person_add</mat-icon>
              Recent Registrations
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="users-list">
              <div class="user-item" *ngFor="let user of (analyticsData?.recentUsers || []).slice(0, 5)">
                <div class="user-avatar">
                  <mat-icon>account_circle</mat-icon>
                </div>
                <div class="user-details">
                  <div class="user-name">{{ user.full_name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
                <div class="user-status">
                  <mat-chip [class]="'status-' + user.status">{{ user.status | titlecase }}</mat-chip>
                  <div class="user-date">{{ user.created_at | date:'short' }}</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Loading Template -->
      <ng-template #loadingTemplate>
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading analytics data...</p>
        </div>
      </ng-template>

      <!-- No Data Template -->
      <ng-template #noDataTemplate>
        <div class="empty-state">
          <mat-icon>bar_chart</mat-icon>
          <p>No data available for the selected period</p>
        </div>
      </ng-template>

      <!-- No Activity Template -->
      <ng-template #noActivityTemplate>
        <div class="empty-state">
          <mat-icon>history</mat-icon>
          <p>No user activity recorded</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      padding: 0;
      background: #f8fafc;
      min-height: 100vh;
    }

    .analytics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 24px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .header-content h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
    }

    .section-icon {
      color: #667eea;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .header-controls {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .timeframe-select {
      min-width: 180px;
    }

    .analytics-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
    }

    .stat-info {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      opacity: 0.8;
    }

    .users-card .stat-icon {
      background: #dbeafe;
      color: #3b82f6;
    }

    .pageviews-card .stat-icon {
      background: #dcfce7;
      color: #22c55e;
    }

    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .charts-section {
      margin-bottom: 24px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .chart-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .chart-card .mat-mdc-card-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }

    .chart-card .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .chart-card .mat-mdc-card-title mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .chart-card .mat-mdc-card-content {
      padding: 20px;
    }

    .daily-stats {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .daily-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }

    .stat-date {
      font-weight: 600;
      color: #374151;
      min-width: 60px;
    }

    .stat-metrics {
      display: flex;
      gap: 16px;
    }

    .metric {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .metric-label {
      font-size: 12px;
      color: #64748b;
    }

    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .page-stats {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .page-stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #22c55e;
    }

    .page-info {
      flex: 1;
    }

    .page-name {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }

    .page-path {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .page-metrics {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .page-visits, .page-users {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }

    .page-visits {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .page-users {
      background: #dcfce7;
      color: #15803d;
    }

    .activity-card,
    .recent-users-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .activity-card .mat-mdc-card-header,
    .recent-users-card .mat-mdc-card-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
    }

    .activity-card .mat-mdc-card-title,
    .recent-users-card .mat-mdc-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .activity-card .mat-mdc-card-title mat-icon,
    .recent-users-card .mat-mdc-card-title mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .activity-card .mat-mdc-card-content,
    .recent-users-card .mat-mdc-card-content {
      padding: 20px;
    }

    .activity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .activity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
    }

    .activity-name {
      font-weight: 500;
      color: #374151;
    }

    .activity-count {
      background: #667eea;
      color: white;
      font-weight: 600;
      font-size: 12px;
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: #e2e8f0;
      border-radius: 50%;
    }

    .user-avatar mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #64748b;
    }

    .user-details {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }

    .user-email {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .user-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .user-date {
      font-size: 11px;
      color: #9ca3af;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #64748b;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .loading-state p,
    .empty-state p {
      margin-top: 16px;
      font-size: 16px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    mat-chip.status-pending {
      background-color: #f59e0b;
      color: white;
    }

    mat-chip.status-approved {
      background-color: #10b981;
      color: white;
    }

    mat-chip.status-rejected {
      background-color: #ef4444;
      color: white;
    }

    @media (max-width: 768px) {
      .analytics-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .header-controls {
        justify-content: center;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .charts-grid {
        grid-template-columns: 1fr;
      }
      
      .activity-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  analyticsData: AnalyticsData | null = null;
  isLoading = false;
  selectedTimeframe = '30d';

  private maxValues = {
    visits: 0,
    users: 0
  };

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.isLoading = true;
    
    this.adminService.getAnalytics(this.selectedTimeframe).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.analyticsData = response.data;
          this.calculateMaxValues();
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Failed to load analytics:', error);
        
        this.snackBar.open('Failed to load analytics data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onTimeframeChange(timeframe: string): void {
    this.selectedTimeframe = timeframe;
    this.loadAnalytics();
  }

  getBarWidth(value: number, type: 'visits' | 'users'): number {
    const maxValue = this.maxValues[type];
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }

  getPageDisplayName(path: string): string {
    const pathNames: { [key: string]: string } = {
      '/dashboard': 'Dashboard',
      '/competitor-analysis': 'Competitor Analysis',
      '/scraping': 'Scraping',
      '/analysis': 'Analysis',
      '/export': 'Export',
      '/admin': 'Admin Panel'
    };

    return pathNames[path] || path;
  }

  getActivityDisplayName(action: string): string {
    const actionNames: { [key: string]: string } = {
      'login': 'User Logins',
      'logout': 'User Logouts',
      'analysis_started': 'Analysis Started',
      'analysis_completed': 'Analysis Completed',
      'scraping_started': 'Scraping Started',
      'export_generated': 'Exports Generated'
    };

    return actionNames[action] || action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private calculateMaxValues(): void {
    if (!this.analyticsData?.dailyStats || this.analyticsData.dailyStats.length === 0) {
      this.maxValues.visits = 0;
      this.maxValues.users = 0;
      return;
    }

    this.maxValues.visits = Math.max(...this.analyticsData.dailyStats.map(s => s.visits));
    this.maxValues.users = Math.max(...this.analyticsData.dailyStats.map(s => s.unique_users));
  }
}
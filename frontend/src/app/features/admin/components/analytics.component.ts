import { Component, OnInit } from '@angular/core';
import { AdminService, AnalyticsData } from '../../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-analytics',
  template: `
    <div class="analytics-dashboard">
      <div class="analytics-header">
        <h2>
          <mat-icon class="section-icon">analytics</mat-icon>
          Site Analytics
        </h2>
        
        <div class="timeframe-controls">
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

      <div class="analytics-content" *ngIf="!isLoading; else loadingTemplate">
        <!-- Summary Stats -->
        <div class="summary-stats">
          <mat-card class="summary-card visitors">
            <div class="summary-content">
              <div class="summary-number">{{ analyticsData?.totalStats?.total_active_users || 0 }}</div>
              <div class="summary-label">Active Users</div>
            </div>
            <mat-icon class="summary-icon">people</mat-icon>
          </mat-card>
          
          <mat-card class="summary-card pageviews">
            <div class="summary-content">
              <div class="summary-number">{{ analyticsData?.totalStats?.total_page_visits || 0 }}</div>
              <div class="summary-label">Page Views</div>
            </div>
            <mat-icon class="summary-icon">visibility</mat-icon>
          </mat-card>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <!-- Daily Activity Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>trending_up</mat-icon>
                Daily Activity
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-placeholder" *ngIf="analyticsData?.dailyStats?.length; else noDataTemplate">
                <div class="daily-stats-list">
                  <div 
                    class="daily-stat-item" 
                    *ngFor="let stat of (analyticsData?.dailyStats || []).slice(0, 7)">
                    <div class="stat-date">{{ stat.date | date:'MMM d' }}</div>
                    <div class="stat-bars">
                      <div class="stat-bar">
                        <span class="bar-label">Visits:</span>
                        <div class="bar-container">
                          <div 
                            class="bar-fill visits" 
                            [style.width.%]="getBarWidth(stat.visits, 'visits')">
                          </div>
                          <span class="bar-value">{{ stat.visits }}</span>
                        </div>
                      </div>
                      <div class="stat-bar">
                        <span class="bar-label">Users:</span>
                        <div class="bar-container">
                          <div 
                            class="bar-fill users" 
                            [style.width.%]="getBarWidth(stat.unique_users, 'users')">
                          </div>
                          <span class="bar-value">{{ stat.unique_users }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Top Pages -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>web</mat-icon>
                Top Pages
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="top-pages-list" *ngIf="analyticsData?.pageStats?.length; else noDataTemplate">
                <div 
                  class="page-stat-item" 
                  *ngFor="let page of (analyticsData?.pageStats || []).slice(0, 10)">
                  <div class="page-info">
                    <div class="page-path">{{ getPageDisplayName(page.page_path) }}</div>
                    <div class="page-url">{{ page.page_path }}</div>
                  </div>
                  <div class="page-metrics">
                    <span class="metric visits">{{ page.visits }} visits</span>
                    <span class="metric users">{{ page.unique_users }} users</span>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- User Activity -->
        <mat-card class="activity-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>history</mat-icon>
              User Activity Overview
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="activity-stats" *ngIf="analyticsData?.activityStats?.length; else noActivityTemplate">
              <div 
                class="activity-item" 
                *ngFor="let activity of (analyticsData?.activityStats || []).slice(0, 10)">
                <div class="activity-name">{{ getActivityDisplayName(activity.action) }}</div>
                <div class="activity-count">
                  <mat-chip class="count-chip">{{ activity.count }}</mat-chip>
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
            <div class="recent-users-list">
              <div 
                class="recent-user-item" 
                *ngFor="let user of (analyticsData?.recentUsers || []).slice(0, 5)">
                <div class="user-avatar">
                  <mat-icon>account_circle</mat-icon>
                </div>
                <div class="user-info">
                  <div class="user-name">{{ user.full_name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
                <div class="user-meta">
                  <mat-chip [class]="'status-' + user.status">{{ user.status | titlecase }}</mat-chip>
                  <div class="user-date">{{ user.created_at | date:'short' }}</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading analytics data...</p>
        </div>
      </ng-template>

      <ng-template #noDataTemplate>
        <div class="no-data">
          <mat-icon>bar_chart</mat-icon>
          <p>No data available for the selected period</p>
        </div>
      </ng-template>

      <ng-template #noActivityTemplate>
        <div class="no-data">
          <mat-icon>history</mat-icon>
          <p>No user activity recorded</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      padding: 0;
    }

    .analytics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .analytics-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #333;
      font-size: 24px;
      font-weight: 600;
    }

    .section-icon {
      color: #3f51b5;
    }

    .timeframe-controls {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .timeframe-select {
      min-width: 150px;
    }

    .analytics-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-radius: 12px;
      border-left: 4px solid;
    }

    .summary-card.visitors {
      border-left-color: #2196f3;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    }

    .summary-card.pageviews {
      border-left-color: #4caf50;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    }

    .summary-content {
      display: flex;
      flex-direction: column;
    }

    .summary-number {
      font-size: 36px;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .summary-label {
      font-size: 16px;
      color: #666;
      margin-top: 4px;
    }

    .summary-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      opacity: 0.7;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .chart-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .daily-stats-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .daily-stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .stat-date {
      font-weight: 600;
      color: #333;
      min-width: 60px;
    }

    .stat-bars {
      flex: 1;
      margin-left: 16px;
    }

    .stat-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .bar-label {
      font-size: 12px;
      color: #666;
      min-width: 45px;
    }

    .bar-container {
      position: relative;
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 10px;
      flex: 1;
      max-width: 120px;
    }

    .bar-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s ease;
    }

    .bar-fill.visits {
      background-color: #2196f3;
    }

    .bar-fill.users {
      background-color: #4caf50;
    }

    .bar-value {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 600;
      color: white;
    }

    .top-pages-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .page-stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #2196f3;
    }

    .page-info {
      flex: 1;
    }

    .page-path {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .page-url {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .page-metrics {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .metric {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .metric.visits {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .metric.users {
      background-color: #e8f5e8;
      color: #388e3c;
    }

    .activity-card,
    .recent-users-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .activity-stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .activity-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .activity-name {
      font-weight: 500;
      color: #333;
    }

    .count-chip {
      background-color: #3f51b5;
      color: white;
      font-weight: 600;
    }

    .recent-users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .recent-user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .user-avatar mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #666;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #333;
    }

    .user-email {
      font-size: 14px;
      color: #666;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .user-date {
      font-size: 12px;
      color: #999;
    }

    .loading-container,
    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #666;
    }

    .loading-container p,
    .no-data p {
      margin-top: 16px;
      font-size: 16px;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    /* Status chips */
    mat-chip.status-pending {
      background-color: #ff9800;
      color: white;
    }

    mat-chip.status-approved {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.status-rejected {
      background-color: #f44336;
      color: white;
    }

    @media (max-width: 768px) {
      .analytics-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .timeframe-controls {
        justify-content: center;
      }
      
      .charts-row {
        grid-template-columns: 1fr;
      }
      
      .activity-stats {
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
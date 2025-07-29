import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="admin-dashboard">
      <div class="admin-header">
        <div class="header-content">
          <h1>
            <mat-icon class="header-icon">admin_panel_settings</mat-icon>
            Super Admin Dashboard
          </h1>
          <p>Manage users and view system analytics</p>
        </div>
        
        <div class="user-info">
          <mat-icon class="user-icon">account_circle</mat-icon>
          <div class="user-details">
            <span class="user-name">{{ currentUser?.fullName }}</span>
            <span class="user-role">{{ currentUser?.role | titlecase }}</span>
          </div>
        </div>
      </div>

      <div class="admin-content">
        <mat-tab-group class="admin-tabs" animationDuration="300ms">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">people</mat-icon>
              User Management
            </ng-template>
            <router-outlet></router-outlet>
          </mat-tab>
          
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">analytics</mat-icon>
              Analytics
            </ng-template>
            <app-analytics></app-analytics>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e0e0e0;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .header-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #3f51b5;
    }

    .header-content p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .user-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #666;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .user-role {
      font-size: 12px;
      color: #666;
      background-color: #e3f2fd;
      padding: 2px 8px;
      border-radius: 12px;
      text-align: center;
    }

    .admin-content {
      min-height: 600px;
    }

    .admin-tabs {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    ::ng-deep .admin-tabs .mat-tab-header {
      background-color: #fafafa;
      border-bottom: 1px solid #e0e0e0;
    }

    ::ng-deep .admin-tabs .mat-tab-label {
      min-width: 160px;
      padding: 16px 24px;
      font-weight: 500;
    }

    .tab-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    ::ng-deep .admin-tabs .mat-tab-body-wrapper {
      padding: 24px;
    }

    @media (max-width: 768px) {
      .admin-dashboard {
        padding: 16px;
      }
      
      .admin-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .header-content h1 {
        font-size: 24px;
      }
      
      .user-info {
        align-self: flex-end;
      }
      
      ::ng-deep .admin-tabs .mat-tab-label {
        min-width: 120px;
        padding: 12px 16px;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  currentUser: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}
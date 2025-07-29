import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AdminUser } from '../../../core/services/admin.service';
import { UserApprovalDialogComponent } from './user-approval-dialog.component';

@Component({
  selector: 'app-user-management',
  template: `
    <div class="user-management">
      <div class="management-header">
        <h2>
          <mat-icon class="section-icon">people</mat-icon>
          User Management
        </h2>
        
        <div class="filter-controls">
          <mat-form-field appearance="outline" class="status-filter">
            <mat-label>Filter by Status</mat-label>
            <mat-select [value]="selectedStatus" (selectionChange)="onStatusFilterChange($event.value)">
              <mat-option value="">All Users</mat-option>
              <mat-option value="pending">Pending Approval</mat-option>
              <mat-option value="approved">Approved</mat-option>
              <mat-option value="rejected">Rejected</mat-option>
            </mat-select>
          </mat-form-field>
          
          <button 
            mat-raised-button 
            color="primary" 
            (click)="refreshUsers()"
            [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <div class="stats-cards" *ngIf="userStats">
        <mat-card class="stat-card pending">
          <div class="stat-content">
            <div class="stat-number">{{ userStats['pending'] || 0 }}</div>
            <div class="stat-label">Pending Approval</div>
          </div>
          <mat-icon class="stat-icon">hourglass_empty</mat-icon>
        </mat-card>
        
        <mat-card class="stat-card approved">
          <div class="stat-content">
            <div class="stat-number">{{ userStats['approved'] || 0 }}</div>
            <div class="stat-label">Approved Users</div>
          </div>
          <mat-icon class="stat-icon">check_circle</mat-icon>
        </mat-card>
        
        <mat-card class="stat-card rejected">
          <div class="stat-content">
            <div class="stat-number">{{ userStats['rejected'] || 0 }}</div>
            <div class="stat-label">Rejected</div>
          </div>
          <mat-icon class="stat-icon">cancel</mat-icon>
        </mat-card>
        
        <mat-card class="stat-card total">
          <div class="stat-content">
            <div class="stat-number">{{ userStats['total'] || 0 }}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <mat-icon class="stat-icon">people</mat-icon>
        </mat-card>
      </div>

      <mat-card class="users-table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>list</mat-icon>
            Users List
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="table-container" *ngIf="!isLoading; else loadingTemplate">
            <table mat-table [dataSource]="dataSource" matSort class="users-table">
              <!-- ID Column -->
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
                <td mat-cell *matCellDef="let user">{{ user.id }}</td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="full_name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Full Name</th>
                <td mat-cell *matCellDef="let user">{{ user.full_name }}</td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <!-- Role Column -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [class]="'role-' + user.role">{{ user.role | titlecase }}</mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let user">
                  <mat-chip [class]="'status-' + user.status">{{ user.status | titlecase }}</mat-chip>
                </td>
              </ng-container>

              <!-- Created Date Column -->
              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Registered</th>
                <td mat-cell *matCellDef="let user">{{ user.created_at | date:'medium' }}</td>
              </ng-container>

              <!-- Last Login Column -->
              <ng-container matColumnDef="last_login">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Login</th>
                <td mat-cell *matCellDef="let user">
                  {{ user.last_login ? (user.last_login | date:'short') : 'Never' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  <div class="action-buttons">
                    <button 
                      mat-icon-button 
                      color="primary"
                      *ngIf="user.status === 'pending'"
                      (click)="openApprovalDialog(user, 'approve')"
                      matTooltip="Approve User">
                      <mat-icon>check</mat-icon>
                    </button>
                    
                    <button 
                      mat-icon-button 
                      color="warn"
                      *ngIf="user.status === 'pending'"
                      (click)="openApprovalDialog(user, 'reject')"
                      matTooltip="Reject User">
                      <mat-icon>close</mat-icon>
                    </button>
                    
                    <button 
                      mat-icon-button
                      (click)="viewUserDetails(user)"
                      matTooltip="View Details">
                      <mat-icon>visibility</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <mat-paginator 
              [pageSizeOptions]="[10, 25, 50, 100]" 
              showFirstLastButtons>
            </mat-paginator>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading users...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-management {
      padding: 0;
    }

    .management-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .management-header h2 {
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

    .filter-controls {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .status-filter {
      min-width: 180px;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid;
    }

    .stat-card.pending {
      border-left-color: #ff9800;
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    }

    .stat-card.approved {
      border-left-color: #4caf50;
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
    }

    .stat-card.rejected {
      border-left-color: #f44336;
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    }

    .stat-card.total {
      border-left-color: #2196f3;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .stat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.7;
    }

    .users-table-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      min-width: 800px;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #666;
    }

    .loading-container p {
      margin-top: 16px;
      font-size: 16px;
    }

    /* Status and role chips */
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

    mat-chip.role-user {
      background-color: #2196f3;
      color: white;
    }

    mat-chip.role-super_admin {
      background-color: #9c27b0;
      color: white;
    }

    @media (max-width: 768px) {
      .management-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
      
      .filter-controls {
        justify-content: center;
      }
      
      .stats-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'id', 
    'full_name', 
    'email', 
    'role', 
    'status', 
    'created_at', 
    'last_login', 
    'actions'
  ];

  dataSource = new MatTableDataSource<AdminUser>([]);
  isLoading = false;
  selectedStatus = '';
  userStats: { [key: string]: number } = {};

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.isLoading = true;
    
    this.adminService.getUsers(this.selectedStatus).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.dataSource.data = response.data.users;
          this.calculateUserStats(response.data.users);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Failed to load users:', error);
        
        this.snackBar.open('Failed to load users', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status;
    this.loadUsers();
  }

  refreshUsers(): void {
    this.loadUsers();
  }

  openApprovalDialog(user: AdminUser, action: 'approve' | 'reject'): void {
    const dialogRef = this.dialog.open(UserApprovalDialogComponent, {
      data: { user, action },
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processUserApproval(user.id, action);
      }
    });
  }

  processUserApproval(userId: number, action: 'approve' | 'reject'): void {
    this.adminService.approveUser(userId, action).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open(
            `User ${action}d successfully!`,
            'Close',
            {
              duration: 3000,
              panelClass: ['success-snackbar']
            }
          );
          
          this.loadUsers();
        }
      },
      error: (error) => {
        console.error(`Failed to ${action} user:`, error);
        
        this.snackBar.open(
          `Failed to ${action} user`,
          'Close',
          {
            duration: 3000,
            panelClass: ['error-snackbar']
          }
        );
      }
    });
  }

  viewUserDetails(user: AdminUser): void {
    // TODO: Implement user details view
    console.log('View user details:', user);
  }

  private calculateUserStats(users: AdminUser[]): void {
    this.userStats = {
      total: users.length,
      pending: users.filter(u => u.status === 'pending').length,
      approved: users.filter(u => u.status === 'approved').length,
      rejected: users.filter(u => u.status === 'rejected').length
    };
  }
}
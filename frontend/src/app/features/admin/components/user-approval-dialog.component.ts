import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminUser } from '../../../core/services/admin.service';

interface DialogData {
  user: AdminUser;
  action: 'approve' | 'reject';
}

@Component({
  selector: 'app-user-approval-dialog',
  template: `
    <div class="approval-dialog">
      <h2 mat-dialog-title>
        <mat-icon [class]="'action-icon ' + data.action">
          {{ data.action === 'approve' ? 'check_circle' : 'cancel' }}
        </mat-icon>
        {{ data.action === 'approve' ? 'Approve' : 'Reject' }} User
      </h2>
      
      <mat-dialog-content>
        <div class="dialog-content">
          <div class="user-info">
            <div class="info-row">
              <strong>Name:</strong>
              <span>{{ data.user.full_name }}</span>
            </div>
            <div class="info-row">
              <strong>Email:</strong>
              <span>{{ data.user.email }}</span>
            </div>
            <div class="info-row">
              <strong>Registration Date:</strong>
              <span>{{ data.user.created_at | date:'medium' }}</span>
            </div>
          </div>
          
          <div class="confirmation-message">
            <p *ngIf="data.action === 'approve'">
              Are you sure you want to <strong>approve</strong> this user? 
              They will be able to access the system immediately.
            </p>
            <p *ngIf="data.action === 'reject'">
              Are you sure you want to <strong>reject</strong> this user? 
              They will not be able to access the system.
            </p>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          Cancel
        </button>
        <button 
          mat-raised-button 
          [color]="data.action === 'approve' ? 'primary' : 'warn'"
          (click)="onConfirm()">
          {{ data.action === 'approve' ? 'Approve User' : 'Reject User' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .approval-dialog {
      padding: 8px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px 0;
      color: #333;
    }

    .action-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .action-icon.approve {
      color: #4caf50;
    }

    .action-icon.reject {
      color: #f44336;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .user-info {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row strong {
      color: #333;
      font-weight: 600;
    }

    .info-row span {
      color: #666;
      text-align: right;
      max-width: 60%;
      overflow-wrap: break-word;
    }

    .confirmation-message {
      padding: 16px;
      background-color: #fff3e0;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
    }

    .confirmation-message p {
      margin: 0;
      color: #e65100;
      line-height: 1.5;
    }

    mat-dialog-actions {
      padding: 16px 0 0 0;
      margin: 0;
    }

    mat-dialog-actions button {
      margin-left: 8px;
    }
  `]
})
export class UserApprovalDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UserApprovalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
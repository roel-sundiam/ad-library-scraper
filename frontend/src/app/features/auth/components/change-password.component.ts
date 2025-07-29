import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  template: `
    <div class="change-password-container">
      <div class="change-password-card-wrapper">
        <mat-card class="change-password-card">
          <mat-card-header>
            <div class="change-password-header">
              <div class="title-section">
                <h2>Change Password</h2>
                <p>Enter your current password and choose a new one</p>
              </div>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <form [formGroup]="changePasswordForm" (ngSubmit)="onSubmit()" class="change-password-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Current Password</mat-label>
                <input
                  matInput
                  [type]="hideCurrentPassword ? 'password' : 'text'"
                  formControlName="currentPassword"
                  placeholder="Enter your current password"
                  autocomplete="current-password">
                <button 
                  mat-icon-button 
                  matSuffix 
                  type="button"
                  (click)="hideCurrentPassword = !hideCurrentPassword">
                  <mat-icon>{{hideCurrentPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="changePasswordForm.get('currentPassword')?.hasError('required')">
                  Current password is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>New Password</mat-label>
                <input
                  matInput
                  [type]="hideNewPassword ? 'password' : 'text'"
                  formControlName="newPassword"
                  placeholder="Enter your new password"
                  autocomplete="new-password">
                <button 
                  mat-icon-button 
                  matSuffix 
                  type="button"
                  (click)="hideNewPassword = !hideNewPassword">
                  <mat-icon>{{hideNewPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="changePasswordForm.get('newPassword')?.hasError('required')">
                  New password is required
                </mat-error>
                <mat-error *ngIf="changePasswordForm.get('newPassword')?.hasError('minlength')">
                  New password must be at least 8 characters long
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm New Password</mat-label>
                <input
                  matInput
                  [type]="hideConfirmPassword ? 'password' : 'text'"
                  formControlName="confirmPassword"
                  placeholder="Confirm your new password"
                  autocomplete="new-password">
                <button 
                  mat-icon-button 
                  matSuffix 
                  type="button"
                  (click)="hideConfirmPassword = !hideConfirmPassword">
                  <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="changePasswordForm.get('confirmPassword')?.hasError('required')">
                  Please confirm your new password
                </mat-error>
                <mat-error *ngIf="changePasswordForm.get('confirmPassword')?.hasError('passwordMismatch')">
                  Passwords do not match
                </mat-error>
              </mat-form-field>

              <div class="form-actions">
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  class="change-password-button"
                  [disabled]="changePasswordForm.invalid || isLoading">
                  <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                  <span *ngIf="!isLoading">Change Password</span>
                  <span *ngIf="isLoading">Changing Password...</span>
                </button>
                
                <button
                  mat-button
                  type="button"
                  class="cancel-button"
                  (click)="onCancel()"
                  [disabled]="isLoading">
                  Cancel
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .change-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .change-password-card-wrapper {
      width: 100%;
      max-width: 500px;
    }

    .change-password-card {
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .change-password-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .title-section h2 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .title-section p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .change-password-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      flex-direction: column;
    }

    .change-password-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
    }

    .cancel-button {
      width: 100%;
      height: 44px;
      font-size: 16px;
      border-radius: 8px;
    }

    mat-spinner {
      margin-right: 8px;
    }

    @media (max-width: 480px) {
      .change-password-container {
        padding: 16px;
      }
      
      .change-password-card {
        padding: 20px;
      }
      
      .title-section h2 {
        font-size: 24px;
      }
    }

    @media (min-width: 600px) {
      .form-actions {
        flex-direction: row;
      }
      
      .change-password-button {
        flex: 2;
      }
      
      .cancel-button {
        flex: 1;
      }
    }
  `]
})
export class ChangePasswordComponent implements OnInit {
  changePasswordForm: FormGroup;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.changePasswordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Redirect if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const { currentPassword, newPassword } = this.changePasswordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.snackBar.open('Password changed successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Navigate back to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.handleError(response.error?.message || 'Password change failed');
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        let errorMessage = 'Password change failed. Please try again.';
        
        if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.handleError(errorMessage);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }

  private handleError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.changePasswordForm.controls).forEach(key => {
      const control = this.changePasswordForm.get(key);
      control?.markAsTouched();
    });
  }
}
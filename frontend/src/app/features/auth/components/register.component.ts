import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="register-container">
      <div class="register-card-wrapper">
        <mat-card class="register-card">
          <mat-card-header>
            <div class="register-header">
              <div class="logo-section">
                <h1>Ad Library Scraper</h1>
                <p>Create your account</p>
              </div>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input
                  matInput
                  type="text"
                  formControlName="fullName"
                  placeholder="Enter your full name"
                  autocomplete="name">
                <mat-icon matSuffix>person</mat-icon>
                <mat-error *ngIf="registerForm.get('fullName')?.hasError('required')">
                  Full name is required
                </mat-error>
                <mat-error *ngIf="registerForm.get('fullName')?.hasError('minlength')">
                  Full name must be at least 2 characters
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  placeholder="Enter your email"
                  autocomplete="email">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="registerForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="registerForm.get('email')?.hasError('email')">
                  Please enter a valid email address
                </mat-error>
                <mat-error *ngIf="registerForm.get('email')?.hasError('emailExists')">
                  This email is already registered. Please use a different email or try logging in.
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  [type]="hidePassword ? 'password' : 'text'"
                  formControlName="password"
                  placeholder="Enter your password"
                  autocomplete="new-password">
                <button 
                  mat-icon-button 
                  matSuffix 
                  type="button"
                  (click)="hidePassword = !hidePassword">
                  <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="registerForm.get('password')?.hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">
                  Password must be at least 8 characters long
                </mat-error>
                <mat-error *ngIf="registerForm.get('password')?.hasError('weakPassword')">
                  Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm Password</mat-label>
                <input
                  matInput
                  [type]="hideConfirmPassword ? 'password' : 'text'"
                  formControlName="confirmPassword"
                  placeholder="Confirm your password"
                  autocomplete="new-password">
                <button 
                  mat-icon-button 
                  matSuffix 
                  type="button"
                  (click)="hideConfirmPassword = !hideConfirmPassword">
                  <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('required')">
                  Please confirm your password
                </mat-error>
                <mat-error *ngIf="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched">
                  Passwords do not match
                </mat-error>
              </mat-form-field>

              <div class="form-actions">
                <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  class="register-button"
                  [disabled]="registerForm.invalid || isLoading">
                  <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                  <span *ngIf="!isLoading">Create Account</span>
                  <span *ngIf="isLoading">Creating Account...</span>
                </button>
              </div>
            </form>

            <div class="info-section" *ngIf="!isLoading">
              <div class="info-card">
                <mat-icon class="info-icon">info</mat-icon>
                <div class="info-content">
                  <h4>Account Approval Required</h4>
                  <p>Your account will be reviewed by a system administrator before you can access the platform.</p>
                  <div class="approval-steps">
                    <div class="step">
                      <mat-icon class="step-icon">check_circle</mat-icon>
                      <span>Submit registration form</span>
                    </div>
                    <div class="step">
                      <mat-icon class="step-icon">review</mat-icon>
                      <span>Admin reviews your request</span>
                    </div>
                    <div class="step">
                      <mat-icon class="step-icon">email</mat-icon>
                      <span>You'll receive approval notification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
          
          <div class="login-link">
            <p>Already have an account? 
              <a routerLink="/auth/login" class="login-link-text">Sign in here</a>
            </p>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card-wrapper {
      width: 100%;
      max-width: 500px;
    }

    .register-card {
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .register-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-section h1 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 28px;
      font-weight: 600;
    }

    .logo-section p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .register-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      margin-top: 24px;
    }

    .register-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
    }

    .info-section {
      margin-top: 24px;
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .info-icon {
      color: #2196f3;
      margin-top: 2px;
    }

    .info-content h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
      font-size: 14px;
      font-weight: 600;
    }

    .info-content p {
      margin: 0 0 12px 0;
      color: #0d47a1;
      font-size: 13px;
      line-height: 1.4;
    }

    .approval-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .approval-steps .step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #546e7a;
    }

    .approval-steps .step-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #2196f3;
    }

    .login-link {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .login-link p {
      margin: 0;
      color: #666;
    }

    .login-link-text {
      color: #3f51b5;
      text-decoration: none;
      font-weight: 500;
    }

    .login-link-text:hover {
      text-decoration: underline;
    }

    mat-spinner {
      margin-right: 8px;
    }

    @media (max-width: 480px) {
      .register-container {
        padding: 16px;
      }
      
      .register-card {
        padding: 20px;
      }
      
      .logo-section h1 {
        font-size: 24px;
      }
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  passwordStrengthValidator(control: any) {
    const password = control.value;
    if (!password) return null;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar) {
      return null; // Valid
    }
    
    return { weakPassword: true };
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const { fullName, email, password } = this.registerForm.value;

    this.authService.register(email, password, fullName).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.snackBar.open(
            'Registration successful! Your account is pending approval.',
            'Close',
            {
              duration: 5000,
              panelClass: ['success-snackbar']
            }
          );
          
          // Redirect to login after successful registration
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        } else {
          this.handleRegistrationError(response.error?.message || 'Registration failed');
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
          
          // Handle duplicate email error
          if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exists')) {
            this.registerForm.get('email')?.setErrors({ emailExists: true });
            return;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.handleRegistrationError(errorMessage);
      }
    });
  }

  private handleRegistrationError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
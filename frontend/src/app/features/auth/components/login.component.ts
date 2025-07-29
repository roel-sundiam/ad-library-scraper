import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <!-- Marketing Section (Left Side) -->
      <div class="marketing-section">
        <div class="marketing-content">
          <!-- Hero Section -->
          <div class="hero-section">
            <div class="logo-brand">
              <mat-icon class="brand-icon">insights</mat-icon>
              <h1 class="brand-title">Ad Library Scraper</h1>
            </div>
            <h2 class="hero-headline">Unlock Facebook's Ad Intelligence</h2>
            <p class="hero-subtitle">
              The ultimate platform for competitive research and ad library analysis. 
              Discover winning strategies, track competitors, and boost your marketing ROI.
            </p>
          </div>

          <!-- Features Grid -->
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>search</mat-icon>
              </div>
              <div class="feature-content">
                <h3>Smart Scraping</h3>
                <p>Access millions of Facebook ads with intelligent data extraction</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>psychology</mat-icon>
              </div>
              <div class="feature-content">
                <h3>AI Analysis</h3>
                <p>Powered by OpenAI & Anthropic for deep competitive insights</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="feature-content">
                <h3>Competitor Intel</h3>
                <p>Track strategies, performance, and creative trends in real-time</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>file_download</mat-icon>
              </div>
              <div class="feature-content">
                <h3>Data Export</h3>
                <p>Export in CSV, Excel, JSON - integrate with your workflow</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>dashboard</mat-icon>
              </div>
              <div class="feature-content">
                <h3>Live Analytics</h3>
                <p>Real-time dashboards with advanced metrics and insights</p>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>speed</mat-icon>
              </div>
              <div class="feature-content">
                <h3>Bulk Processing</h3>
                <p>Handle thousands of ads efficiently with automated workflows</p>
              </div>
            </div>
          </div>

          <!-- Benefits Section -->
          <div class="benefits-section">
            <h3 class="benefits-title">Why Marketing Teams Choose Us</h3>
            <ul class="benefits-list">
              <li><mat-icon>check_circle</mat-icon> Save 10+ hours per week on research</li>
              <li><mat-icon>check_circle</mat-icon> Increase campaign ROI by 40%+</li>
              <li><mat-icon>check_circle</mat-icon> Stay ahead of competitor strategies</li>
              <li><mat-icon>check_circle</mat-icon> Make data-driven creative decisions</li>
            </ul>
          </div>

          <!-- Social Proof -->
          <div class="social-proof">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-number">1M+</div>
                <div class="stat-label">Ads Analyzed</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">500+</div>
                <div class="stat-label">Happy Users</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">24/7</div>
                <div class="stat-label">Data Updates</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Login Section (Right Side) -->
      <div class="login-section">
        <div class="login-card-wrapper">
          <mat-card class="login-card">
            <mat-card-header>
              <div class="login-header">
                <h2 class="login-title">Welcome Back</h2>
                <p class="login-subtitle">Sign in to access your dashboard</p>
              </div>
            </mat-card-header>
            
            <mat-card-content>
              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <input
                    matInput
                    type="email"
                    formControlName="email"
                    placeholder="Enter your email"
                    autocomplete="email">
                  <mat-icon matSuffix>email</mat-icon>
                  <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                    Email is required
                  </mat-error>
                  <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                    Please enter a valid email
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input
                    matInput
                    [type]="hidePassword ? 'password' : 'text'"
                    formControlName="password"
                    placeholder="Enter your password"
                    autocomplete="current-password">
                  <button 
                    mat-icon-button 
                    matSuffix 
                    type="button"
                    (click)="hidePassword = !hidePassword">
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                  <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                    Password is required
                  </mat-error>
                </mat-form-field>

                <div class="form-actions">
                  <button
                    mat-raised-button
                    color="primary"
                    type="submit"
                    class="login-button"
                    [disabled]="loginForm.invalid || isLoading">
                    <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                    <span *ngIf="!isLoading">Sign In</span>
                    <span *ngIf="isLoading">Signing In...</span>
                  </button>
                </div>
              </form>
            </mat-card-content>
            
            <div class="register-link">
              <p>New to Ad Library Scraper? 
                <a routerLink="/auth/register" class="register-link-text">Create Account</a>
              </p>
            </div>

            <!-- Quick Features Preview -->
            <div class="login-features-preview">
              <h4>What you'll get access to:</h4>
              <div class="preview-features">
                <div class="preview-feature">
                  <mat-icon>analytics</mat-icon>
                  <span>Advanced Analytics</span>
                </div>
                <div class="preview-feature">
                  <mat-icon>speed</mat-icon>
                  <span>Bulk Export</span>
                </div>
                <div class="preview-feature">
                  <mat-icon>security</mat-icon>
                  <span>Secure Platform</span>
                </div>
              </div>
            </div>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    /* Marketing Section (Left Side) */
    .marketing-section {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px;
      color: white;
      overflow-y: auto;
      max-height: 100vh;
      scroll-behavior: smooth;
    }

    .marketing-content {
      max-width: 600px;
      width: 100%;
      padding: 40px 0;
      min-height: min-content;
    }

    /* Hero Section */
    .hero-section {
      margin-bottom: 48px;
    }

    .logo-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .brand-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #ffffff;
    }

    .brand-title {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      color: #ffffff;
    }

    .hero-headline {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 16px 0;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .hero-subtitle {
      font-size: 20px;
      line-height: 1.6;
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 300;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }

    .feature-card {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
    }

    .feature-card:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }

    .feature-icon {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      height: 48px;
    }

    .feature-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #ffffff;
    }

    .feature-content h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #ffffff;
    }

    .feature-content p {
      font-size: 14px;
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.5;
    }

    /* Benefits Section */
    .benefits-section {
      margin-bottom: 48px;
    }

    .benefits-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 24px 0;
      color: #ffffff;
    }

    .benefits-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .benefits-list li {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 16px;
      color: rgba(255, 255, 255, 0.9);
    }

    .benefits-list mat-icon {
      color: #4ade80;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Social Proof */
    .social-proof {
      margin-top: 48px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-number {
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .stat-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Login Section (Right Side) */
    .login-section {
      flex: 0 0 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .login-card-wrapper {
      width: 100%;
      max-width: 400px;
    }

    .login-card {
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.05);
      background: #ffffff;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .login-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1f2937;
    }

    .login-subtitle {
      font-size: 16px;
      margin: 0;
      color: #6b7280;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      margin-top: 24px;
    }

    .login-button {
      width: 100%;
      height: 52px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      transition: all 0.3s ease;
    }

    .login-button:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    .login-button:disabled {
      background: #e5e7eb;
      color: #9ca3af;
    }

    .register-link {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .register-link p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }

    .register-link-text {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.3s ease;
    }

    .register-link-text:hover {
      color: #5a67d8;
      text-decoration: underline;
    }

    /* Login Features Preview */
    .login-features-preview {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .login-features-preview h4 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px 0;
      text-align: center;
    }

    .preview-features {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .preview-feature {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 1;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .preview-feature:hover {
      background: #f3f4f6;
      transform: translateY(-1px);
    }

    .preview-feature mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .preview-feature span {
      font-size: 12px;
      color: #374151;
      font-weight: 500;
      text-align: center;
    }

    mat-spinner {
      margin-right: 8px;
    }

    /* Custom Scrollbar Styling */
    .marketing-section::-webkit-scrollbar {
      width: 8px;
    }

    .marketing-section::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    .marketing-section::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      transition: background 0.3s ease;
    }

    .marketing-section::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    /* Firefox scrollbar styling */
    .marketing-section {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
      .login-section {
        flex: 0 0 420px;
      }
      
      .hero-headline {
        font-size: 40px;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    @media (max-width: 768px) {
      .login-container {
        flex-direction: column;
        height: auto;
        min-height: 100vh;
      }
      
      .marketing-section {
        flex: none;
        padding: 32px 24px;
        order: 2;
        max-height: none;
        overflow-y: visible;
      }
      
      .login-section {
        flex: none;
        padding: 32px 24px;
        order: 1;
        background: #ffffff;
        position: static;
        height: auto;
        overflow-y: visible;
      }
      
      .marketing-content {
        max-width: none;
      }
      
      .hero-headline {
        font-size: 32px;
      }
      
      .hero-subtitle {
        font-size: 18px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 24px;
        text-align: left;
      }
      
      .stat-item {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .stat-number {
        font-size: 24px;
        margin-bottom: 0;
      }
      
      .benefits-section {
        margin-bottom: 32px;
      }
      
      .login-card {
        padding: 24px;
        border-radius: 12px;
      }
    }

    @media (max-width: 480px) {
      .marketing-section,
      .login-section {
        padding: 24px 16px;
      }
      
      .hero-headline {
        font-size: 28px;
      }
      
      .hero-subtitle {
        font-size: 16px;
      }
      
      .login-card {
        padding: 20px;
      }
      
      .login-title {
        font-size: 24px;
      }
      
      .preview-features {
        flex-direction: column;
        gap: 8px;
      }
      
      .preview-feature {
        flex-direction: row;
        justify-content: flex-start;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  returnUrl = '/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.snackBar.open('Login successful!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          this.router.navigate([this.returnUrl]);
        } else {
          this.handleLoginError(response.error?.message || 'Login failed');
        }
      },
      error: (error) => {
        this.isLoading = false;
        
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.handleLoginError(errorMessage);
      }
    });
  }

  private handleLoginError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}
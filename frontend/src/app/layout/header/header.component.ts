import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'ads-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateToHome(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToChangePassword(): void {
    this.router.navigate(['/auth/change-password']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.snackBar.open('Logged out successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.snackBar.open('Logout failed. Please try again.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        // Force navigation to login even if logout request failed
        this.router.navigate(['/auth/login']);
      }
    });
  }

  get userDisplayName(): string {
    return this.currentUser?.fullName || this.currentUser?.email || 'User';
  }

  get isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin';
  }
}
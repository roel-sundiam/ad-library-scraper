import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd, Event } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { filter, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeRouteTracking();
  }

  private initializeRouteTracking(): void {
    // Track page visits on route changes
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
      switchMap((event: NavigationEnd) => {
        // Only track if user is authenticated
        if (this.authService.isAuthenticated()) {
          return this.trackPageVisit(event.urlAfterRedirects || event.url);
        }
        return of(null);
      })
    ).subscribe({
      next: (result) => {
        if (result) {
          console.log('Page visit tracked:', result);
        }
      },
      error: (error) => {
        console.error('Failed to track page visit:', error);
      }
    });
  }

  trackPageVisit(pagePath: string) {
    // Don't track auth pages or API calls
    if (pagePath.startsWith('/auth') || pagePath.startsWith('/api')) {
      return of(null);
    }

    return this.http.post(`${this.baseUrl}/analytics/page-visit`, {
      pagePath: pagePath,
      timestamp: new Date().toISOString()
    });
  }

  trackUserAction(action: string, details?: any) {
    if (!this.authService.isAuthenticated()) {
      return of(null);
    }

    return this.http.post(`${this.baseUrl}/analytics/user-action`, {
      action: action,
      details: details,
      timestamp: new Date().toISOString()
    });
  }

  // Helper methods for common actions
  trackLogin() {
    return this.trackUserAction('login');
  }

  trackLogout() {
    return this.trackUserAction('logout');
  }

  trackAnalysisStarted(details?: any) {
    return this.trackUserAction('analysis_started', details);
  }

  trackAnalysisCompleted(details?: any) {
    return this.trackUserAction('analysis_completed', details);
  }

  trackScrapingStarted(details?: any) {
    return this.trackUserAction('scraping_started', details);
  }

  trackExportGenerated(details?: any) {
    return this.trackUserAction('export_generated', details);
  }
}
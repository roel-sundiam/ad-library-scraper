import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { FacebookAnalysisResponse } from '../../../shared/models/facebook-ads.interface';

@Component({
  selector: 'app-competitor-analysis',
  templateUrl: './competitor-analysis.component.html',
  styleUrls: ['./competitor-analysis.component.scss']
})
export class CompetitorAnalysisComponent implements OnInit {
  analysisForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  scraperStatuses: any = {};

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.analysisForm = this.fb.group({
      competitorUrl: ['', [Validators.required, this.facebookUrlValidator]]
    });
  }

  ngOnInit(): void {
    this.checkScraperStatuses();
  }

  openFacebookConfig(): void {
    this.router.navigate(['/competitor-analysis/facebook-config']);
  }

  checkScraperStatuses(): void {
    // Check Apify status
    this.apiService.getApifyStatus().subscribe({
      next: (response) => {
        this.scraperStatuses.apify = response.success ? 'online' : 'offline';
      },
      error: () => {
        this.scraperStatuses.apify = 'offline';
      }
    });

    // Check Facebook API status
    this.apiService.getFacebookApiStatus().subscribe({
      next: (response) => {
        this.scraperStatuses.facebook = response.success ? 'online' : 'offline';
      },
      error: () => {
        this.scraperStatuses.facebook = 'offline';
      }
    });
  }

  onSubmit(): void {
    if (this.analysisForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const formData = this.analysisForm.value;
      
      // Use new single competitor API
      this.apiService.startFacebookAnalysis({
        pageUrls: [formData.competitorUrl]
      }).subscribe({
        next: (response: FacebookAnalysisResponse) => {
          if (response.success && response.data.runId) {
            // Navigate to progress dashboard with run ID
            this.router.navigate(['/competitor-analysis/progress', response.data.runId]);
          } else {
            this.errorMessage = 'Failed to start analysis. Please try again.';
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          console.error('Error starting Facebook analysis:', error);
          this.errorMessage = error.error?.error?.message || 'An error occurred. Please try again.';
          this.isSubmitting = false;
        }
      });
    }
  }

  // Custom validator for Facebook URLs
  facebookUrlValidator(control: any): { [key: string]: any } | null {
    if (!control.value) return null;
    
    try {
      const url = new URL(control.value);
      const hostname = url.hostname.toLowerCase();
      
      // Check if it's a Facebook domain
      const validDomains = ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'];
      if (!validDomains.includes(hostname)) {
        return { invalidFacebookUrl: true };
      }
      
      // Check if it has a path (not just the domain)
      const path = url.pathname;
      if (path === '/' || path === '') {
        return { invalidFacebookUrl: true };
      }
      
      // Check if it's not an ad library URL
      if (path.includes('/ads/library')) {
        return { adLibraryUrl: true };
      }
      
      return null;
    } catch (error) {
      return { invalidUrl: true };
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.analysisForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Competitor URL is required';
      }
      if (control.errors['invalidUrl']) {
        return 'Please enter a valid URL';
      }
      if (control.errors['invalidFacebookUrl']) {
        return 'Please enter a valid Facebook page URL';
      }
      if (control.errors['adLibraryUrl']) {
        return 'Please use the public Facebook page URL, not the Ad Library URL';
      }
    }
    return '';
  }
}
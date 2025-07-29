import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'ads-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isLoading = true;
  apiHealth: any = null;
  error: string | null = null;
  
  // Facebook Token Configuration
  tokenStatus: any = null;
  showTokenForm = false;
  newToken = '';
  isUpdatingToken = false;
  tokenMessage: { type: 'success' | 'error' | 'warning', text: string } | null = null;
  
  // Competitor Analysis Status
  hasExistingAnalysis = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkApiHealth();
    this.loadTokenStatus();
  }

  checkApiHealth() {
    this.apiService.healthCheck().subscribe({
      next: (response) => {
        this.apiHealth = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Unable to connect to API server';
        this.isLoading = false;
        console.error('API Health check failed:', error);
      }
    });
  }

  loadTokenStatus(): void {
    this.apiService.getFacebookTokenStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.tokenStatus = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading token status:', error);
      }
    });
  }

  updateFacebookToken(): void {
    if (!this.newToken || this.newToken.length < 50) {
      this.tokenMessage = {
        type: 'error',
        text: 'Please enter a valid Facebook access token'
      };
      return;
    }

    this.isUpdatingToken = true;
    this.tokenMessage = null;

    this.apiService.updateFacebookToken(this.newToken).subscribe({
      next: (response) => {
        this.isUpdatingToken = false;
        if (response.success) {
          let successMessage = `Facebook access token updated successfully! ✅`;
          
          // Add expiration info
          if (response.data.expiresAt) {
            successMessage += ` Expires: ${new Date(response.data.expiresAt).toLocaleDateString()}`;
          }
          
          // Add Ad Library API access status
          if (response.data.adLibraryAccess) {
            if (response.data.adLibraryAccess.hasAccess) {
              successMessage += ` 🎯 Ad Library API: ✅ Enabled (will use real Facebook ads data)`;
            } else {
              const errorMsg = response.data.adLibraryAccess.error || 'No access';
              successMessage += ` ⚠️ Ad Library API: ❌ ${errorMsg} (will use HTTP scraper fallback)`;
            }
          }
          
          this.tokenMessage = {
            type: response.data.adLibraryAccess?.hasAccess ? 'success' : 'warning',
            text: successMessage
          };
          this.newToken = '';
          this.showTokenForm = false;
          this.loadTokenStatus();
          
          // Clear success message after 8 seconds (longer for more info)
          setTimeout(() => {
            this.tokenMessage = null;
          }, 8000);
        } else {
          // Show specific error message with helpful context
          let errorMessage = response.error?.message || 'Failed to update token';
          
          // Add helpful context based on error code
          if (response.error?.code === 'TOKEN_EXPIRED') {
            errorMessage += ' 🔄 Click "Get Token" button to generate a new one.';
          } else if (response.error?.code === 'TOKEN_INVALID') {
            errorMessage += ' ❓ Make sure you copied the complete token from Facebook Graph API Explorer.';
          } else if (response.error?.code === 'TOKEN_MALFORMED') {
            errorMessage += ' 📋 Please copy the entire token without any extra spaces or characters.';
          }
          
          this.tokenMessage = {
            type: 'error',
            text: errorMessage
          };
        }
      },
      error: (error) => {
        this.isUpdatingToken = false;
        
        // Parse error response for enhanced messaging
        
        // Check if the error response contains our enhanced error message
        let errorMessage = 'Failed to update Facebook access token';
        
        // Try different possible error structures
        if (error.error && error.error.error && error.error.error.message) {
          // Case 1: error.error.error.message
          errorMessage = error.error.error.message;
          
          // Add helpful context based on error code
          if (error.error.error.code === 'TOKEN_EXPIRED') {
            errorMessage += ' 🔄 Click "Get Token" button to generate a new one.';
          } else if (error.error.error.code === 'TOKEN_INVALID') {
            errorMessage += ' ❓ Make sure you copied the complete token from Facebook Graph API Explorer.';
          } else if (error.error.error.code === 'TOKEN_MALFORMED') {
            errorMessage += ' 📋 Please copy the entire token without any extra spaces or characters.';
          } else if (errorMessage.includes('lacks required permissions')) {
            errorMessage += ' 🔑 Visit Facebook Graph API Explorer and ensure your token has the "ads_read" permission.';
          } else if (errorMessage.includes('format is invalid')) {
            errorMessage += ' 📋 Make sure you copied the complete token from Facebook without any extra characters.';
          }
        } else if (error.error && error.error.message) {
          // Case 2: error.error.message
          errorMessage = error.error.message;
        }
        
        this.tokenMessage = {
          type: 'error',
          text: errorMessage
        };
        console.error('Error updating token:', error);
      }
    });
  }

  openFacebookConsole(): void {
    window.open('https://developers.facebook.com/tools/explorer/', '_blank');
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }
}
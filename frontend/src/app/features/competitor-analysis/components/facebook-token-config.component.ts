import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-facebook-token-config',
  templateUrl: './facebook-token-config.component.html',
  styleUrls: ['./facebook-token-config.component.scss']
})
export class FacebookTokenConfigComponent implements OnInit {
  tokenForm: FormGroup;
  tokenStatus: any = null;
  isLoading = false;
  isUpdating = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.tokenForm = this.fb.group({
      accessToken: ['', [Validators.required, Validators.minLength(50)]]
    });
  }

  ngOnInit(): void {
    this.loadTokenStatus();
  }

  loadTokenStatus(): void {
    this.isLoading = true;
    this.apiService.getFacebookTokenStatus().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.tokenStatus = response.data;
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading token status:', error);
      }
    });
  }

  updateToken(): void {
    if (this.tokenForm.invalid) {
      this.errorMessage = 'Please enter a valid Facebook access token';
      return;
    }

    this.isUpdating = true;
    this.successMessage = '';
    this.errorMessage = '';

    const accessToken = this.tokenForm.get('accessToken')?.value;

    this.apiService.updateFacebookToken(accessToken).subscribe({
      next: (response) => {
        this.isUpdating = false;
        if (response.success) {
          this.successMessage = 'Facebook access token updated successfully!';
          this.tokenForm.reset();
          this.loadTokenStatus();
          
          // Clear success message after 5 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 5000);
        } else {
          this.errorMessage = response.error?.message || 'Failed to update token';
        }
      },
      error: (error) => {
        this.isUpdating = false;
        this.errorMessage = error.error?.error?.message || 'Failed to update Facebook access token';
        console.error('Error updating token:', error);
      }
    });
  }

  openFacebookDeveloperConsole(): void {
    window.open('https://developers.facebook.com/tools/explorer/', '_blank');
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
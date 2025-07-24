import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'ads-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isLoading = true;
  apiHealth: any = null;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.checkApiHealth();
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
}
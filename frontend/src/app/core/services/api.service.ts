import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Health check
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  // Scraping endpoints
  startScraping(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/scrape`, request);
  }

  getScrapingJob(jobId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/scrape/${jobId}`);
  }

  getScrapingResults(jobId: string, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/scrape/${jobId}/results`, { params: httpParams });
  }

  // Analysis endpoints
  startAnalysis(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze`, request);
  }

  getAnalysisResults(analysisId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/analyze/${analysisId}`);
  }

  // Export endpoints
  exportData(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export`, { params });
  }

  // Models and usage
  getAvailableModels(): Observable<any> {
    return this.http.get(`${this.baseUrl}/models`);
  }

  getUsageStats(period?: string): Observable<any> {
    let httpParams = new HttpParams();
    if (period) {
      httpParams = httpParams.set('period', period);
    }
    return this.http.get(`${this.baseUrl}/usage`, { params: httpParams });
  }
}
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
    return this.http.post(`${this.baseUrl}/analysis`, request);
  }

  testAnalysisConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analysis/test`);
  }

  // Video transcription endpoints
  transcribeVideo(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/videos/transcript`, request);
  }

  testVideoService(): Observable<any> {
    return this.http.get(`${this.baseUrl}/videos/test`);
  }

  // Video processing status
  getVideoProcessingStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/scrape/${jobId}/videos`);
  }

  // Export endpoints (placeholder for future implementation)
  exportData(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export`, { params });
  }

  // Facebook Ads Analysis endpoints (NEW - Live System)
  startFacebookAnalysis(request: { pageUrls: string[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/start-analysis`, request);
  }

  getAnalysisStatus(runId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/${runId}`);
  }

  getAnalysisResults(runId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/results/${runId}`);
  }

  // Scraper status endpoints
  getApifyStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/apify/status`);
  }

  getFacebookApiStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/facebook/status`);
  }

  // Legacy Competitor Analysis Workflow endpoints (DEPRECATED)
  startCompetitorAnalysis(request: { yourPageUrl: string; competitor1Url: string; competitor2Url: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/workflow/competitor-analysis`, request);
  }

  getWorkflowStatus(workflowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/workflow/${workflowId}/status`);
  }

  getWorkflowResults(workflowId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/workflow/${workflowId}/results`);
  }

  // Facebook Configuration endpoints
  updateFacebookToken(accessToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/config/facebook-token`, { accessToken });
  }

  getFacebookTokenStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/config/facebook-status`);
  }

  cancelWorkflow(workflowId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/workflow/${workflowId}/cancel`, {});
  }
}
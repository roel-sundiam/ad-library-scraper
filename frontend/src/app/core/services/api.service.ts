import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  // AI Chat endpoints
  sendChatMessage(request: { message: string; workflowId?: string; conversationHistory?: any[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/analysis/chat`, request);
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

  // Export endpoints
  exportData(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export`, { params });
  }

  exportAnalysisResults(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export/analysis-results`, { params });
  }

  exportTranscripts(params: any): Observable<any> {
    return this.http.get(`${this.baseUrl}/export/transcripts`, { params });
  }

  getExportOptions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/export/options`);
  }

  exportFacebookAnalysis(datasetId: string, options?: { includeTranscripts?: boolean }): Observable<any> {
    let params = new HttpParams();
    if (options?.includeTranscripts !== undefined) {
      params = params.set('includeTranscripts', options.includeTranscripts.toString());
    }
    
    return this.http.get(`${this.baseUrl}/export/facebook-analysis/${datasetId}`, { params });
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

  // Legacy Competitor Analysis Workflow endpoints (DEPRECATED - REMOVED)
  // Use startFacebookAnalysis with single URL instead

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

  // Bulk Video Analysis endpoints
  startBulkVideoAnalysis(request: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/videos/bulk-analysis`, request);
  }

  getBulkAnalysisStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/videos/bulk-analysis/${jobId}/status`);
  }

  getBulkAnalysisResults(jobId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/videos/bulk-analysis/${jobId}/results`);
  }

  // Debug endpoints for video transcription
  getDebugTranscriptions(workflowId?: string, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (workflowId) params = params.set('workflowId', workflowId);
    if (limit) params = params.set('limit', limit.toString());
    
    return this.http.get(`${this.baseUrl}/debug/videos/transcriptions`, { params });
  }

  testVideoTranscription(videoUrl: string, options?: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/debug/videos/test-transcribe`, { 
      videoUrl, 
      options: options || {} 
    });
  }

  getDebugVideoAds(workflowId?: string, advertiser?: string, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (workflowId) params = params.set('workflowId', workflowId);
    if (advertiser) params = params.set('advertiser', advertiser);
    if (limit) params = params.set('limit', limit.toString());
    
    return this.http.get(`${this.baseUrl}/debug/ads/videos`, { params });
  }
}
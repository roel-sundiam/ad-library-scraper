import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface Platform {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

@Component({
  selector: 'ads-scraping',
  templateUrl: './scraping.component.html',
  styleUrls: ['./scraping.component.scss', './scraping-results.scss']
})
export class ScrapingComponent implements OnInit {
  scrapingForm: FormGroup;
  platforms: Platform[] = [
    { id: 'facebook', name: 'Facebook/Meta', icon: 'facebook', available: true },
    { id: 'google', name: 'Google Ads', icon: 'search', available: true },
    { id: 'tiktok', name: 'TikTok', icon: 'video_library', available: false },
    { id: 'linkedin', name: 'LinkedIn', icon: 'business', available: false }
  ];
  
  isSubmitting = false;
  currentJob: any = null;
  jobError: string | null = null;
  scrapedAds: any[] = [];
  showResults = false;
  isLoadingResults = false;
  
  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {
    this.scrapingForm = this.fb.group({
      platform: ['facebook', Validators.required],
      query: ['', Validators.required],
      limit: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      region: ['US'],
      dateRange: ['30_days'],
      filters: this.fb.group({
        adType: ['all'],
        minImpressions: [null],
        languages: [[]]
      })
    });
  }
  
  ngOnInit() {
    // Component initialization
  }
  
  async onSubmit() {
    if (this.scrapingForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.jobError = null;
      
      try {
        const formValue = this.scrapingForm.value;
        console.log('Starting scraping job with:', formValue);
        
        const response = await this.apiService.startScraping(formValue).toPromise();
        console.log('API Response:', response);
        this.currentJob = response;
        
        // Start monitoring the job
        this.monitorJob(response.data?.job_id || 'test-job');
        
      } catch (error: any) {
        console.error('Scraping request failed:', error);
        this.jobError = error.error?.error?.message || error.message || 'Failed to start scraping job';
      } finally {
        this.isSubmitting = false;
      }
    }
  }
  
  private monitorJob(jobId: string) {
    // For now just simulate job monitoring
    // Later we'll add real-time WebSocket updates
    console.log('Monitoring job:', jobId);
  }
  
  async viewResults(jobId: string) {
    this.isLoadingResults = true;
    try {
      const response = await this.apiService.getScrapingResults(jobId).toPromise();
      console.log('Scraped ads data:', response);
      this.scrapedAds = response.data.ads;
      this.showResults = true;
    } catch (error) {
      console.error('Failed to load results:', error);
      this.jobError = 'Failed to load scraping results';
    } finally {
      this.isLoadingResults = false;
    }
  }

  resetForm() {
    this.scrapingForm.reset({
      platform: 'facebook',
      query: '',
      limit: 100,
      region: 'US',
      dateRange: '30_days',
      filters: {
        adType: 'all',
        minImpressions: null,
        languages: []
      }
    });
    this.currentJob = null;
    this.jobError = null;
    this.scrapedAds = [];
    this.showResults = false;
  }

  closeResults() {
    this.showResults = false;
    this.scrapedAds = [];
  }
}
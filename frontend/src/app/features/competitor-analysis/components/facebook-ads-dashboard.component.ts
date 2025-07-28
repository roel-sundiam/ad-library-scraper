import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { 
  FacebookAnalysisResults, 
  FacebookAd, 
  CompetitorPageData,
  AdMetricsSummary,
  CompetitorComparison 
} from '../../../shared/models/facebook-ads.interface';

@Component({
  selector: 'app-facebook-ads-dashboard',
  templateUrl: './facebook-ads-dashboard.component.html',
  styleUrls: ['./facebook-ads-dashboard.component.scss']
})
export class FacebookAdsDashboardComponent implements OnInit {
  datasetId: string = '';
  analysisResults: FacebookAnalysisResults | null = null;
  isLoading = true;
  errorMessage = '';
  
  // Dashboard data
  brandComparisons: CompetitorComparison[] = [];
  totalAds = 0;
  totalVideoAds = 0;
  totalAdvertisers = 0;
  videoContentRate = 0;
  topPerformingAds: FacebookAd[] = [];
  
  // Display options
  selectedMetric: 'impressions' | 'spend' | 'cpm' | 'ctr' = 'impressions';
  chartView: 'overview' | 'detailed' = 'overview';
  
  // AI Analysis properties
  customPrompt = '';
  customAnalysisResult: any = null;
  isAnalyzing = false;
  showQuickPrompts = false;
  
  quickPrompts = [
    'Analyze video content strategies across competitors',
    'What messaging themes are most common in these ads?',
    'Compare creative formats and their effectiveness',
    'Identify opportunities to differentiate from competitors',
    'What call-to-action strategies are being used?',
    'Analyze seasonal content and timing patterns'
  ];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.datasetId = this.route.snapshot.params['datasetId'] || this.route.snapshot.params['runId'];
    if (this.datasetId) {
      this.loadAnalysisResults();
    } else {
      this.errorMessage = 'Invalid analysis ID';
      this.isLoading = false;
    }
  }

  loadAnalysisResults(): void {
    this.apiService.getAnalysisResults(this.datasetId).subscribe({
      next: (response: FacebookAnalysisResults) => {
        this.isLoading = false;
        if (response.success) {
          this.analysisResults = response;
          this.processAnalysisData();
        } else {
          this.errorMessage = 'Failed to load analysis results';
        }
      },
      error: (error) => {
        console.error('Error loading analysis results:', error);
        this.errorMessage = error.error?.error?.message || 'Failed to load results';
        this.isLoading = false;
      }
    });
  }

  processAnalysisData(): void {
    if (!this.analysisResults?.data) return;

    const brands = Object.keys(this.analysisResults.data);
    this.brandComparisons = [];
    this.totalAds = 0;
    this.totalVideoAds = 0;
    this.totalAdvertisers = 0;
    this.topPerformingAds = [];

    brands.forEach(brandKey => {
      const brandData: CompetitorPageData = this.analysisResults!.data[brandKey];
      
      if (brandData.ads_data && brandData.ads_data.length > 0) {
        const metrics = this.calculateBrandMetrics(brandData.ads_data);
        
        this.brandComparisons.push({
          brand: brandData.page_name,
          metrics: metrics,
          market_share: 0, // Will calculate after all brands processed
          ad_frequency: brandData.ads_found,
          creative_types: {
            image: brandData.ads_data.filter(ad => !ad.creative.has_video).length,
            video: brandData.ads_data.filter(ad => ad.creative.has_video).length,
            carousel: 0 // Could be enhanced to detect carousel ads
          }
        });

        this.totalAds += brandData.ads_found;
        this.totalVideoAds += brandData.ads_data.filter(ad => ad.creative.has_video).length;
        this.totalAdvertisers++;
        
        // Add ads for content analysis (replace top performing logic)
        this.topPerformingAds.push(...brandData.ads_data);
      }
    });

    // Calculate video content rate
    this.videoContentRate = this.totalAds > 0 ? (this.totalVideoAds / this.totalAds) * 100 : 0;

    // Calculate market share by ad volume instead of spend
    this.brandComparisons.forEach(brand => {
      brand.market_share = this.totalAds > 0 ? 
        (brand.ad_frequency / this.totalAds) * 100 : 0;
    });

    // Sort ads by recency instead of impressions
    this.topPerformingAds.sort((a, b) => {
      const dateA = new Date(a.dates.start_date || 0);
      const dateB = new Date(b.dates.start_date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    this.topPerformingAds = this.topPerformingAds.slice(0, 5);
  }

  calculateBrandMetrics(ads: FacebookAd[]): AdMetricsSummary {
    // Calculate meaningful metrics instead of unavailable ones
    const videoAds = ads.filter(ad => ad.creative.has_video).length;
    const videoRate = ads.length > 0 ? (videoAds / ads.length) * 100 : 0;
    
    // Calculate average ad text length
    const avgTextLength = ads.length > 0 ? 
      ads.reduce((sum, ad) => sum + (ad.creative.body?.length || 0), 0) / ads.length : 0;
    
    // Get most recent ads for this brand
    const recentAds = ads
      .sort((a, b) => {
        const dateA = new Date(a.dates.start_date || 0);
        const dateB = new Date(b.dates.start_date || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);

    return {
      total_impressions: videoRate, // Repurpose as video content rate
      total_spend: avgTextLength,   // Repurpose as average text length
      average_cpm: videoAds,        // Repurpose as video ad count
      average_ctr: ads.length - videoAds, // Repurpose as image ad count
      ads_count: ads.length,
      top_performers: recentAds
    };
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }

  getBrandColor(index: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  }

  onMetricChange(metric: 'impressions' | 'spend' | 'cpm' | 'ctr'): void {
    this.selectedMetric = metric;
  }

  onChartViewChange(view: 'overview' | 'detailed'): void {
    this.chartView = view;
  }

  exportData(): void {
    if (!this.analysisResults) return;

    const dataToExport = {
      analysis_summary: {
        total_ads: this.totalAds,
        total_advertisers: this.totalAdvertisers,
        total_video_ads: this.totalVideoAds,
        video_content_rate: this.videoContentRate,
        brands_analyzed: this.brandComparisons.length
      },
      brand_comparisons: this.brandComparisons,
      recent_ads: this.topPerformingAds,
      raw_data: this.analysisResults.data
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facebook-ads-analysis-${this.datasetId}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }

  getMetricValue(brand: CompetitorComparison, metric: string): number {
    switch (metric) {
      case 'impressions':
        return brand.metrics.total_impressions;
      case 'spend':
        return brand.metrics.total_spend;
      case 'cpm':
        return brand.metrics.average_cpm;
      case 'ctr':
        return brand.metrics.average_ctr;
      default:
        return 0;
    }
  }

  getAdPreviewText(ad: FacebookAd): string {
    const text = ad.creative.body || ad.creative.description || 'No text available';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  openAdDetails(ad: FacebookAd): void {
    // Could open a modal or navigate to detailed view
    if (ad.metadata.ad_snapshot_url) {
      window.open(ad.metadata.ad_snapshot_url, '_blank');
    } else {
      alert(`Ad Details:\n\nAdvertiser: ${ad.advertiser.name}\nFormat: ${ad.creative.has_video ? 'Video' : 'Image'}\nText Length: ${ad.creative.body?.length || 0} characters\nStatus: ${ad.metadata.is_active ? 'Active' : 'Historical'}\nSource: ${ad.metadata.source}`);
    }
  }

  // AI Analysis Methods
  runCustomAnalysis(): void {
    if (!this.customPrompt.trim() || this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.customAnalysisResult = null;

    // Use the workflow ID from the analysis results
    const workflowId = this.datasetId; // Use datasetId as workflow identifier

    const analysisRequest = {
      prompt: this.customPrompt,
      workflowId: workflowId,
      filters: {
        analysis_type: 'custom_competitor_analysis',
        dashboard_context: true
      }
    };

    this.apiService.startAnalysis(analysisRequest).subscribe({
      next: (response) => {
        this.isAnalyzing = false;
        if (response.success) {
          this.customAnalysisResult = response.data;
        } else {
          console.error('Analysis failed:', response);
          alert('Analysis failed. Please try again.');
        }
      },
      error: (error) => {
        console.error('Analysis error:', error);
        this.isAnalyzing = false;
        alert('Analysis failed. Please check your connection and try again.');
      }
    });
  }

  useQuickPrompt(prompt: string): void {
    this.customPrompt = prompt;
    this.showQuickPrompts = false;
  }

  formatAnalysisResult(analysis: string): string {
    if (!analysis) return '';
    
    // Convert markdown-like formatting to HTML
    return analysis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• /g, '• ')
      .replace(/\n/g, '<br>');
  }

  getAnalysisResultsForChat(): any {
    if (!this.analysisResults) return null;

    // Format data for the AI chat component
    return {
      workflow_id: this.datasetId,
      analysis: {
        summary: {
          your_page: {
            page_name: this.brandComparisons[0]?.brand || 'Your Brand',
            total_ads: this.brandComparisons[0]?.ad_frequency || 0,
            performance_score: Math.round(this.brandComparisons[0]?.metrics?.total_impressions || 75)
          },
          competitors: this.brandComparisons.slice(1).map(brand => ({
            page_name: brand.brand,
            total_ads: brand.ad_frequency,
            performance_score: Math.round(brand.metrics.total_impressions)
          }))
        },
        insights: [
          `Video content appears in ${this.videoContentRate.toFixed(1)}% of analyzed ads`,
          `${this.totalAdvertisers} brands are actively advertising`,
          `Total of ${this.totalAds} ads analyzed across all competitors`,
          'Creative formats vary significantly between competitors'
        ],
        recommendations: [
          'Increase video content production to match industry standards',
          'Analyze competitor messaging themes for opportunities',
          'Test different creative formats based on competitor insights',
          'Monitor competitor advertising frequency patterns'
        ],
        analyzed_at: new Date().toISOString(),
        ai_provider: 'enhanced_mock'
      },
      credits_used: 0
    };
  }
}
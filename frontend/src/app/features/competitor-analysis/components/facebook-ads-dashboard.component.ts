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
  totalImpressions = 0;
  totalSpend = 0;
  averageCPM = 0;
  topPerformingAds: FacebookAd[] = [];
  
  // Display options
  selectedMetric: 'impressions' | 'spend' | 'cpm' | 'ctr' = 'impressions';
  chartView: 'overview' | 'detailed' = 'overview';

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
    this.totalImpressions = 0;
    this.totalSpend = 0;
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
        this.totalImpressions += metrics.total_impressions;
        this.totalSpend += metrics.total_spend;
        
        // Add top performing ads
        this.topPerformingAds.push(...metrics.top_performers);
      }
    });

    // Calculate market share
    this.brandComparisons.forEach(brand => {
      brand.market_share = this.totalSpend > 0 ? 
        (brand.metrics.total_spend / this.totalSpend) * 100 : 0;
    });

    // Calculate average CPM
    this.averageCPM = this.brandComparisons.length > 0 ?
      this.brandComparisons.reduce((sum, brand) => sum + brand.metrics.average_cpm, 0) / this.brandComparisons.length : 0;

    // Sort top performing ads
    this.topPerformingAds.sort((a, b) => b.metrics.impressions_max - a.metrics.impressions_max);
    this.topPerformingAds = this.topPerformingAds.slice(0, 5);
  }

  calculateBrandMetrics(ads: FacebookAd[]): AdMetricsSummary {
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.metrics.impressions_min, 0);
    const totalSpend = ads.reduce((sum, ad) => sum + ad.metrics.spend_min, 0);
    const avgCPM = ads.reduce((sum, ad) => sum + parseFloat(ad.metrics.cpm), 0) / ads.length;
    const avgCTR = ads.reduce((sum, ad) => sum + parseFloat(ad.metrics.ctr), 0) / ads.length;
    
    // Get top 3 performing ads for this brand
    const topPerformers = ads
      .sort((a, b) => b.metrics.impressions_max - a.metrics.impressions_max)
      .slice(0, 3);

    return {
      total_impressions: totalImpressions,
      total_spend: totalSpend,
      average_cpm: avgCPM,
      average_ctr: avgCTR,
      ads_count: ads.length,
      top_performers: topPerformers
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
        total_impressions: this.totalImpressions,
        total_spend: this.totalSpend,
        average_cpm: this.averageCPM,
        brands_analyzed: this.brandComparisons.length
      },
      brand_comparisons: this.brandComparisons,
      top_performing_ads: this.topPerformingAds,
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
      alert(`Ad Details:\n\nAdvertiser: ${ad.advertiser.name}\nImpressions: ${this.formatNumber(ad.metrics.impressions_min)}+\nSpend: ${this.formatCurrency(ad.metrics.spend_min)}+\nCPM: $${ad.metrics.cpm}\nSource: ${ad.metadata.source}`);
    }
  }
}
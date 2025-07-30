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
  
  // Bulk Video Analysis properties
  analysisMode: 'general' | 'video' | 'debug' = 'general';
  selectedVideoTemplate: string = '';
  showVideoTemplates = false;
  isBulkAnalyzing = false;
  bulkAnalysisProgress: any = null;
  bulkAnalysisResult: any = null;
  includeTranscripts = true; // Default to enabled for better video analysis
  includeVisualAnalysis = false; // Requires additional AI vision capabilities

  // Debug properties
  debugTab: 'transcriptions' | 'test' | 'videos' = 'transcriptions';
  debugLoading = false;
  transcriptionsData: any = null;
  videoAdsData: any = null;
  testVideoUrl = '';
  testingVideo = false;
  testResult: any = null;
  testError: string = '';

  // Export properties
  isExporting = false;
  
  // Content expansion properties
  isAnalysisExpanded = false;
  isSummaryExpanded = false;
  isRecommendationsExpanded = false;
  
  // Modern Video Modal properties
  showVideoModal = false;
  modalTitle = '';
  displayedVideos: any[] = [];
  allModalVideos: any[] = [];
  totalModalVideos = 0;
  videoBreakdown: any[] = [];
  isFiltered = false;
  videosPerPage = 10;
  currentVideoPage = 1;
  
  // General analysis prompts
  quickPrompts = [
    'Analyze advertising strategies and messaging themes',
    'What creative formats are most effective?',
    'Compare targeting and demographic approaches',
    'Identify competitive opportunities and gaps',
    'Analyze call-to-action strategies and conversions',
    'Review seasonal content and timing patterns'
  ];

  // Video-specific analysis templates
  videoAnalysisTemplates = [
    {
      id: 'complete_video_analysis',
      name: 'Complete Video Content Analysis',
      description: 'Comprehensive analysis of all video elements',
      prompt: `Analyze ALL competitor videos comprehensively:

1. **Messaging & Content Strategy**:
   - Core value propositions and messaging themes
   - Emotional triggers and persuasion techniques
   - Brand positioning and market differentiation

2. **Visual & Creative Elements**:
   - Visual styles, color schemes, and branding consistency
   - Scene composition and cinematography quality
   - Text overlays, graphics, and visual storytelling

3. **Audio & Transcript Analysis**:
   - Spoken messaging patterns and script structures
   - Voice tone, music, and sound design choices
   - Call-to-action delivery and placement

4. **Strategic Intelligence**:
   - Target audience indicators and demographics
   - Competitive advantages highlighted
   - Market gaps and opportunities for differentiation

Provide actionable insights and strategic recommendations based on the complete video analysis.`
    },
    {
      id: 'transcript_audio_focus',
      name: 'Transcript & Audio Deep Dive',
      description: 'Focus on spoken content and audio elements',
      prompt: `Analyze transcripts and audio elements from all competitor videos:

1. **Spoken Messaging Patterns**:
   - Key phrases and value proposition delivery
   - Emotional language and persuasion techniques
   - Script structures and narrative flows

2. **Voice & Tone Analysis**:
   - Speaker demographics and voice characteristics
   - Tone consistency across videos
   - Professional vs authentic delivery styles

3. **Audio Branding & Design**:
   - Background music choices and brand alignment
   - Sound effects and audio transitions
   - Voice-over vs on-screen talent usage

4. **Call-to-Action Analysis**:
   - CTA placement and delivery methods
   - Urgency creation and conversion techniques
   - Offer positioning and value communication

Focus on audio-specific competitive intelligence and recommendations.`
    },
    {
      id: 'visual_creative_analysis',
      name: 'Visual & Creative Strategy',
      description: 'Deep dive into visual elements and design choices',
      prompt: `Analyze visual elements and creative strategies across all videos:

1. **Visual Brand Identity**:
   - Color palette consistency and brand alignment
   - Logo placement and brand visibility
   - Visual hierarchy and design principles

2. **Cinematography & Production**:
   - Video quality and production values
   - Camera angles and shot compositions
   - Lighting and visual aesthetics

3. **Creative Storytelling**:
   - Visual narrative techniques
   - Scene transitions and pacing
   - Product showcasing methods

4. **Text & Graphics**:
   - On-screen text usage and typography
   - Graphic overlays and animations
   - Visual call-out strategies

Identify visual competitive advantages and creative opportunities.`
    },
    {
      id: 'competitive_intelligence',
      name: 'Strategic Competitive Intelligence',
      description: 'Strategic analysis for competitive positioning',
      prompt: `Generate strategic competitive intelligence from all competitor videos:

1. **Market Positioning Analysis**:
   - How does the competitor position themselves?
   - What unique selling propositions are emphasized?
   - Market segment targeting and messaging alignment

2. **Competitive Advantage Assessment**:
   - Key differentiators highlighted in videos
   - Strengths and capabilities showcased
   - Market positioning vs actual capabilities

3. **Gap Analysis & Opportunities**:
   - Messaging gaps and unaddressed pain points
   - Visual and creative differentiation opportunities
   - Market positioning vulnerabilities

4. **Strategic Recommendations**:
   - Counter-positioning strategies
   - Differentiation opportunities
   - Creative and messaging improvements

Provide actionable competitive intelligence for strategic planning.`
    },
    {
      id: 'performance_optimization',
      name: 'Performance & Optimization Insights',
      description: 'Analysis focused on video performance and optimization',
      prompt: `Analyze video performance patterns and optimization strategies:

1. **Content Performance Patterns**:
   - Video length and engagement optimization
   - Hook effectiveness in first 3-5 seconds
   - Content structure and retention techniques

2. **Platform Optimization**:
   - Video formatting for social media platforms
   - Aspect ratios and display optimization
   - Mobile vs desktop viewing considerations

3. **Conversion Optimization**:
   - CTA placement and conversion design
   - Landing page alignment with video content
   - Purchase journey and funnel optimization

4. **Creative Testing Insights**:
   - A/B testing indicators and variations
   - Creative refresh patterns and timing
   - Performance-driven creative decisions

Focus on actionable optimization recommendations for video campaigns.`
    }
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
    this.topPerformingAds.sort((a: any, b: any) => {
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
      .sort((a: any, b: any) => {
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

  // Helper method to extract real ad data for AI analysis
  private extractAdDataForAnalysis(): any[] {
    if (!this.analysisResults?.data) return [];
    
    const allAds: any[] = [];
    const brands = Object.keys(this.analysisResults.data);
    
    brands.forEach(brandKey => {
      const brandData = this.analysisResults!.data[brandKey];
      if (brandData.ads_data && brandData.ads_data.length > 0) {
        brandData.ads_data.forEach(ad => {
          allAds.push({
            advertiser_name: brandData.page_name,
            ad_creative_body: ad.creative?.body || ad.creative?.title || '',
            ad_text: ad.creative?.description || '',
            creative: {
              has_video: ad.creative?.has_video || false,
              image_url: ad.creative?.images?.[0] || '',
              video_urls: ad.creative?.video_urls || [],
              video_transcripts: (ad.creative as any)?.video_transcripts || []
            },
            metrics: {
              impressions: (ad as any).metrics?.impressions || 0,
              clicks: (ad as any).metrics?.clicks || 0,
              spend: (ad as any).metrics?.spend || 0
            },
            targeting: ad.targeting || {},
            dates: ad.dates || {},
            platforms: (ad as any).platforms || []
          });
        });
      }
    });
    
    return allAds;
  }

  // AI Analysis Methods
  runCustomAnalysis(): void {
    if (!this.customPrompt.trim() || this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.customAnalysisResult = null;

    // Extract real ad data for contextual analysis
    const realAdData = this.extractAdDataForAnalysis();
    
    const analysisRequest: any = {
      prompt: this.customPrompt,
      adsData: realAdData, // Include actual scraped ad data
      filters: {
        analysis_type: 'custom_competitor_analysis',
        dashboard_context: true,
        total_ads: realAdData.length,
        brands_analyzed: this.brandComparisons.length
      }
    };

    // Only add workflowId if we have valid datasetId and it's not a mock dataset
    if (this.datasetId && !this.datasetId.startsWith('dataset_')) {
      analysisRequest.workflowId = this.datasetId;
    }
    
    console.log('Custom Analysis Request with real data:', {
      adsCount: realAdData.length,
      brands: realAdData.map(ad => ad.advertiser_name).filter((name, index, arr) => arr.indexOf(name) === index),
      hasVideoTranscripts: realAdData.some(ad => ad.creative.video_transcripts?.length > 0)
    });

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

  // Video Analysis Methods
  switchAnalysisMode(mode: 'general' | 'video' | 'debug'): void {
    this.analysisMode = mode;
    this.customPrompt = '';
    this.selectedVideoTemplate = '';
    this.customAnalysisResult = null;
    this.bulkAnalysisResult = null;
    
    // Initialize debug mode
    if (mode === 'debug') {
      this.debugTab = 'transcriptions';
      this.loadTranscriptions();
    }
  }

  useVideoTemplate(templateId: string): void {
    const template = this.videoAnalysisTemplates.find(t => t.id === templateId);
    if (template) {
      this.customPrompt = template.prompt;
      this.selectedVideoTemplate = templateId;
      this.showVideoTemplates = false;
    }
  }

  async startBulkVideoAnalysis(): Promise<void> {
    if (!this.customPrompt.trim() || this.isBulkAnalyzing) return;

    // Get all video ads for analysis
    const allVideoAds = this.getAllVideoAds();
    if (allVideoAds.length === 0) {
      alert('No video ads found for analysis. Please ensure the competitor has video content.');
      return;
    }

    this.isBulkAnalyzing = true;
    this.bulkAnalysisResult = null;
    this.bulkAnalysisProgress = {
      stage: 'initializing',
      message: 'Preparing video analysis...',
      current: 0,
      total: allVideoAds.length,
      percentage: 0
    };

    try {
      const analysisRequest: any = {
        videos: allVideoAds.map(video => ({
          id: video.id,
          brand: video.brand,
          url: video.creative?.video_urls?.[0],
          text: (video.creative?.body || video.creative?.title || '').substring(0, 500), // Limit text length
          date: video.dates?.start_date,
          facebook_url: `https://www.facebook.com/ads/library/?id=${video.id}`
        })),
        prompt: this.customPrompt.substring(0, 2000), // Limit prompt length
        options: {
          includeTranscripts: this.includeTranscripts,
          includeVisualAnalysis: this.includeVisualAnalysis,
          analysisType: this.selectedVideoTemplate || 'custom',
          competitorName: (this.brandComparisons[0]?.brand || 'Competitor').substring(0, 100)
        }
      };

      // Only add workflowId if we have valid datasetId and it's not a mock dataset
      if (this.datasetId && !this.datasetId.startsWith('dataset_')) {
        analysisRequest.workflowId = this.datasetId;
      }

      // Log request size for debugging
      const requestSize = JSON.stringify(analysisRequest).length;
      console.log(`Bulk video analysis request size: ${requestSize} characters (${(requestSize / 1024 / 1024).toFixed(2)} MB)`);

      const response = await this.apiService.startBulkVideoAnalysis(analysisRequest).toPromise();
      
      if (response.success) {
        this.bulkAnalysisProgress.stage = 'processing';
        this.bulkAnalysisProgress.jobId = response.data.jobId;
        
        // Start polling for progress
        this.pollBulkAnalysisProgress(response.data.jobId);
      } else {
        throw new Error(response.error?.message || 'Failed to start bulk video analysis');
      }

    } catch (error) {
      console.error('Bulk video analysis failed:', error);
      this.isBulkAnalyzing = false;
      this.bulkAnalysisProgress = null;
      alert('Failed to start bulk video analysis. Please try again.');
    }
  }

  private getAllVideoAds(): any[] {
    const allVideoAds: any[] = [];
    
    if (this.analysisResults?.data) {
      Object.values(this.analysisResults.data).forEach((brandData: any) => {
        if (brandData.ads_data) {
          const videoAds = brandData.ads_data
            .filter((ad: any) => ad.creative?.has_video)
            .map((ad: any) => ({
              ...ad,
              brand: brandData.page_name
            }));
          
          allVideoAds.push(...videoAds);
        }
      });
    }

    return allVideoAds;
  }

  private async pollBulkAnalysisProgress(jobId: string): Promise<void> {
    try {
      const response = await this.apiService.getBulkAnalysisStatus(jobId).toPromise();
      
      if (response.success) {
        this.bulkAnalysisProgress = { 
          ...this.bulkAnalysisProgress, 
          ...response.data,
          percentage: Math.round((response.data.current / response.data.total) * 100)
        };

        if (response.data.status === 'completed') {
          this.isBulkAnalyzing = false;
          this.bulkAnalysisResult = response.data.results;
          this.bulkAnalysisProgress.stage = 'completed';
        } else if (response.data.status === 'failed') {
          this.isBulkAnalyzing = false;
          this.bulkAnalysisProgress = null;
          alert('Bulk video analysis failed: ' + (response.data.error || 'Unknown error'));
        } else {
          // Continue polling
          setTimeout(() => this.pollBulkAnalysisProgress(jobId), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to get bulk analysis status:', error);
      this.isBulkAnalyzing = false;
      this.bulkAnalysisProgress = null;
      alert('Failed to track analysis progress.');
    }
  }

  cancelBulkAnalysis(): void {
    if (this.bulkAnalysisProgress?.jobId) {
      // TODO: Implement cancel API call
      this.isBulkAnalyzing = false;
      this.bulkAnalysisProgress = null;
    }
  }

  downloadBulkAnalysisReport(): void {
    if (this.bulkAnalysisResult) {
      const reportData = {
        analysis_type: 'bulk_video_analysis',
        competitor: this.brandComparisons[0]?.brand || 'Competitor',
        generated_at: new Date().toISOString(),
        total_videos_analyzed: this.bulkAnalysisProgress?.total || 0,
        analysis_template: this.selectedVideoTemplate || 'custom',
        prompt_used: this.customPrompt,
        results: this.bulkAnalysisResult
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk-video-analysis-${this.brandComparisons[0]?.brand || 'competitor'}-${Date.now()}.json`;
      link.click();
      
      window.URL.revokeObjectURL(url);
    }
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

    // Extract real ad data for contextual chat
    const realAdData = this.extractAdDataForAnalysis();
    
    // Format data for the AI chat component with real context
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
        ai_provider: 'real_data_analysis',
        // Include real ad data for AI context
        real_ads_data: realAdData.slice(0, 20), // Limit to first 20 ads to avoid token limits
        brands_analyzed: Array.from(new Set(realAdData.map(ad => ad.advertiser_name))),
        total_real_ads: realAdData.length
      },
      credits_used: 0
    };
  }

  // Show all video ads
  showVideoAds(): void {
    console.log('showVideoAds() called!', this.analysisResults);
    
    if (!this.analysisResults) {
      alert('No analysis results available');
      return;
    }

    // Collect all video ads from all brands
    const allVideoAds: any[] = [];
    
    Object.values(this.analysisResults.data).forEach((brandData: any) => {
      console.log('Processing brand:', brandData.page_name, 'with', brandData.ads_data?.length || 0, 'total ads');
      
      if (brandData.ads_data) {
        const videoAds = brandData.ads_data.filter((ad: any) => ad.creative?.has_video);
        console.log('Found', videoAds.length, 'video ads for', brandData.page_name);
        
        allVideoAds.push(...videoAds.map((ad: any) => ({
          ...ad,
          brand: brandData.page_name
        })));
      }
    });

    console.log('Total video ads collected:', allVideoAds.length);

    // Sort by date (most recent first)
    allVideoAds.sort((a: any, b: any) => {
      const dateA = new Date(a.dates?.start_date || 0);
      const dateB = new Date(b.dates?.start_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Open modern video modal
    this.openVideoModal(allVideoAds, 'All Competitor Videos');
  }

  // Modern Video Modal Methods
  openVideoModal(videoAds: any[], title: string, filtered = false): void {
    this.allModalVideos = videoAds;
    this.totalModalVideos = videoAds.length;
    this.modalTitle = title;
    this.isFiltered = filtered;
    this.currentVideoPage = 1;
    
    // Calculate breakdown by brand
    this.calculateVideoBreakdown();
    
    // Load first page of videos
    this.loadVideoPage();
    
    // Show modal
    this.showVideoModal = true;
  }

  calculateVideoBreakdown(): void {
    const breakdown: { [key: string]: number } = {};
    
    this.allModalVideos.forEach(video => {
      const brand = video.brand || 'Unknown';
      breakdown[brand] = (breakdown[brand] || 0) + 1;
    });

    this.videoBreakdown = Object.entries(breakdown).map(([name, count], index) => ({
      name,
      count,
      index
    }));
  }

  loadVideoPage(): void {
    const startIndex = (this.currentVideoPage - 1) * this.videosPerPage;
    const endIndex = startIndex + this.videosPerPage;
    this.displayedVideos = this.allModalVideos.slice(0, endIndex);
  }

  loadMoreVideos(): void {
    this.currentVideoPage++;
    this.loadVideoPage();
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.allModalVideos = [];
    this.displayedVideos = [];
    this.videoBreakdown = [];
  }

  // Show videos filtered by specific brand
  showBrandVideos(brandName: string): void {
    console.log('showBrandVideos() called for:', brandName);
    
    if (!this.analysisResults) {
      alert('No analysis results available');
      return;
    }

    // Find the specific brand's data
    let brandData: any = null;
    Object.values(this.analysisResults.data).forEach((data: any) => {
      if (data.page_name === brandName) {
        brandData = data;
      }
    });

    if (!brandData || !brandData.ads_data) {
      alert(`No video data found for ${brandName}`);
      return;
    }

    // Filter for video ads from this specific brand
    const brandVideoAds = brandData.ads_data
      .filter((ad: any) => ad.creative?.has_video)
      .map((ad: any) => ({
        ...ad,
        brand: brandName
      }));

    // Sort by date (most recent first)
    brandVideoAds.sort((a: any, b: any) => {
      const dateA = new Date(a.dates?.start_date || 0);
      const dateB = new Date(b.dates?.start_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

    if (brandVideoAds.length === 0) {
      alert(`No video ads found for ${brandName}`);
      return;
    }

    // Open modern modal for brand-specific videos
    this.openVideoModal(brandVideoAds, `${brandName} Videos`, true);
  }

  // Helper methods for modern modal
  get hasMoreVideos(): boolean {
    return this.displayedVideos.length < this.allModalVideos.length;
  }

  get remainingVideos(): number {
    return this.allModalVideos.length - this.displayedVideos.length;
  }

  getVideoText(video: any): string {
    return video.creative?.body || video.creative?.title || 'No text available';
  }

  getVideoUrl(video: any): string | null {
    // Check for video URLs in various possible fields
    if (video.creative?.video_urls && video.creative.video_urls.length > 0) {
      return video.creative.video_urls[0];
    }
    
    // Check for video URL in other possible fields
    if (video.creative?.video_url) {
      return video.creative.video_url;
    }
    
    // Check for media URLs that might contain video
    if (video.creative?.media && Array.isArray(video.creative.media)) {
      const videoMedia = video.creative.media.find((media: any) => 
        media.type === 'video' || media.media_type === 'video'
      );
      if (videoMedia?.url) {
        return videoMedia.url;
      }
    }
    
    // If we know it has video but no URL is available, return null
    // This indicates the video exists but URL is not accessible via API
    return null;
  }

  getFacebookUrl(adId: string): string {
    // For mock data, create realistic-looking Facebook ad URLs
    if (adId && (adId.includes('apify_') || adId.includes('mock_'))) {
      // Extract numeric part and create a realistic Facebook ad ID
      const numericPart = adId.replace(/\D/g, ''); // Remove all non-digits
      const mockFacebookId = numericPart.padStart(15, '1'); // Ensure 15 digits like real Facebook ad IDs
      return `https://www.facebook.com/ads/library/?id=${mockFacebookId}`;
    }
    
    return `https://www.facebook.com/ads/library/?id=${adId}`;
  }

  // Navigate to AI chat with video context for analysis
  analyzeVideoWithAI(video: any): void {
    // Close the video modal first
    this.closeVideoModal();
    
    // Prepare video analysis prompt
    const videoInfo = {
      brand: video.brand,
      text: this.getVideoText(video),
      date: this.formatDate(video.dates?.start_date),
      facebook_url: this.getFacebookUrl(video.id),
      video_url: this.getVideoUrl(video)
    };
    
    // Create analysis prompt with video details
    const analysisPrompt = `Analyze this competitor video ad:

Brand: ${videoInfo.brand}
Date: ${videoInfo.date}
Ad Text: "${videoInfo.text}"
Facebook URL: ${videoInfo.facebook_url}
${videoInfo.video_url ? `Video URL: ${videoInfo.video_url}` : 'Video URL: Not available'}

Please provide insights on:
1. Messaging strategy and positioning
2. Target audience implications
3. Creative approach and format
4. Competitive intelligence insights
5. Opportunities for differentiation

Context: This is part of my competitor analysis dataset with ${this.totalVideoAds} total video ads across ${this.brandComparisons.length} brands.`;

    // Set the prompt in the custom analysis field
    this.customPrompt = analysisPrompt;
    
    // Scroll to AI analysis section
    setTimeout(() => {
      const aiSection = document.querySelector('.ai-analysis-card');
      if (aiSection) {
        aiSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        // Focus on the prompt textarea
        const textarea = document.querySelector('textarea[matInput]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  getBrandColorForName(brandName: string): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const index = Math.abs(brandName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  }

  exportVideoData(): void {
    const videoData = {
      summary: {
        total_videos: this.totalModalVideos,
        breakdown: this.videoBreakdown,
        exported_at: new Date().toISOString()
      },
      videos: this.allModalVideos.map(video => ({
        brand: video.brand,
        text: this.getVideoText(video),
        date: video.dates?.start_date,
        facebook_url: this.getFacebookUrl(video.id),
        video_url: video.creative?.video_urls?.[0] || null
      }))
    };

    const blob = new Blob([JSON.stringify(videoData, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-analysis-${this.modalTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }

  // Helper methods for the new progress display
  getStageStatus(stage: string): boolean {
    if (!this.bulkAnalysisProgress) return false;
    
    const stageOrder = ['initializing', 'transcribing', 'analyzing', 'completed'];
    const currentIndex = stageOrder.indexOf(this.bulkAnalysisProgress.stage);
    const targetIndex = stageOrder.indexOf(stage);
    
    return currentIndex > targetIndex || (currentIndex === targetIndex && this.bulkAnalysisProgress.stage === 'completed');
  }

  getStageIcon(stage: string): string {
    const currentStage = this.bulkAnalysisProgress?.stage;
    const isCompleted = this.getStageStatus(stage);
    const isActive = currentStage === stage;
    
    if (isCompleted && stage !== 'completed') {
      return 'check_circle';
    }
    
    switch (stage) {
      case 'initializing':
        return isActive ? 'hourglass_top' : 'radio_button_unchecked';
      case 'transcribing':
        return isActive ? 'autorenew' : 'radio_button_unchecked';
      case 'analyzing':
        return isActive ? 'psychology' : 'radio_button_unchecked';
      case 'completed':
        return isCompleted ? 'check_circle' : 'radio_button_unchecked';
      default:
        return 'radio_button_unchecked';
    }
  }

  // Content expansion methods
  toggleAnalysisExpansion(): void {
    this.isAnalysisExpanded = !this.isAnalysisExpanded;
  }

  toggleSummaryExpansion(): void {
    this.isSummaryExpanded = !this.isSummaryExpanded;
  }

  toggleRecommendationsExpansion(): void {
    this.isRecommendationsExpanded = !this.isRecommendationsExpanded;
  }

  // Enhanced formatAnalysisResult with expand/collapse support
  getDisplayContent(content: string, isExpanded: boolean, maxLength: number = 1000): string {
    if (!content) return '';
    
    const formattedContent = this.formatAnalysisResult(content);
    
    if (isExpanded || formattedContent.length <= maxLength) {
      return formattedContent;
    }
    
    // Find good truncation points in order of preference
    const truncated = formattedContent.substring(0, maxLength);
    const searchStart = Math.max(0, maxLength * 0.7); // Look in last 30% of truncated content
    
    // Look for paragraph breaks first
    let lastBreak = truncated.lastIndexOf('<br><br>', searchStart);
    if (lastBreak === -1) {
      // Look for single line breaks
      lastBreak = truncated.lastIndexOf('<br>', searchStart);
    }
    if (lastBreak === -1) {
      // Look for sentence endings
      lastBreak = truncated.lastIndexOf('. ', searchStart);
      if (lastBreak !== -1) lastBreak += 1; // Include the period
    }
    if (lastBreak === -1) {
      // Look for any period
      lastBreak = truncated.lastIndexOf('.', searchStart);
      if (lastBreak !== -1) lastBreak += 1; // Include the period
    }
    
    if (lastBreak > searchStart) {
      return truncated.substring(0, lastBreak + 1) + (lastBreak < maxLength - 10 ? '...' : '');
    }
    
    // Fallback: truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ', maxLength - 50);
    if (lastSpace > searchStart) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  shouldShowExpandButton(content: string, maxLength: number = 1000): boolean {
    if (!content) return false;
    return this.formatAnalysisResult(content).length > maxLength;
  }

  // Debug Methods
  loadTranscriptions(): void {
    this.debugLoading = true;
    this.transcriptionsData = null;
    
    this.apiService.getDebugTranscriptions().subscribe({
      next: (response) => {
        this.transcriptionsData = response.data;
        this.debugLoading = false;
      },
      error: (error) => {
        console.error('Failed to load transcriptions:', error);
        this.transcriptionsData = null;
        this.debugLoading = false;
      }
    });
  }

  loadVideoAds(): void {
    this.debugLoading = true;
    this.videoAdsData = null;
    
    this.apiService.getDebugVideoAds().subscribe({
      next: (response) => {
        this.videoAdsData = response.data;
        this.debugLoading = false;
      },
      error: (error) => {
        console.error('Failed to load video ads:', error);
        this.videoAdsData = null;
        this.debugLoading = false;
      }
    });
  }

  testVideoTranscription(): void {
    if (!this.testVideoUrl) return;
    
    this.testingVideo = true;
    this.testResult = null;
    this.testError = '';
    
    this.apiService.testVideoTranscription(this.testVideoUrl).subscribe({
      next: (response) => {
        this.testResult = response.data;
        this.testingVideo = false;
      },
      error: (error) => {
        console.error('Video transcription test failed:', error);
        this.testError = error.error?.message || error.message || 'Test failed';
        this.testingVideo = false;
      }
    });
  }

  viewFullTranscript(transcript: any): void {
    // You could implement a modal or dialog here to show the full transcript
    alert(`Full Transcript:\n\n${transcript.transcript_text}`);
  }

  viewVideoUrls(videoAd: any): void {
    // You could implement a modal to show all video URLs
    const urls = videoAd.video_urls?.join('\n') || 'No URLs available';
    alert(`Video URLs:\n\n${urls}`);
  }

  // Export Methods
  exportTranscriptResults(): void {
    this.isExporting = true;
    
    try {
      // Create export data from bulk analysis results
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportType: 'transcript_results',
          datasetId: this.datasetId,
          source: 'facebook_ads_dashboard'
        },
        transcriptionStats: this.bulkAnalysisResult?.transcription_stats || {},
        transcripts: this.extractTranscriptData(),
        summary: {
          totalVideos: this.bulkAnalysisResult?.transcription_stats?.total || 0,
          successfulTranscriptions: this.bulkAnalysisResult?.transcription_stats?.successful || 0,
          failedTranscriptions: this.bulkAnalysisResult?.transcription_stats?.failed || 0,
          totalCost: this.bulkAnalysisResult?.transcription_stats?.totalCost || 0
        }
      };

      this.downloadFile(exportData, 'transcript-results');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  exportAnalysisResults(): void {
    this.isExporting = true;
    
    try {
      // Create export data from complete analysis results
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportType: 'full_analysis_results',
          datasetId: this.datasetId,
          source: 'facebook_ads_dashboard'
        },
        transcriptionStats: this.bulkAnalysisResult?.transcription_stats || {},
        transcripts: this.extractTranscriptData(),
        analysis: {
          summary: this.bulkAnalysisResult?.summary || '',
          detailedAnalysis: this.bulkAnalysisResult?.analysis || '',
          processedAt: new Date().toISOString()
        },
        videoAnalysisSettings: {
          includeTranscripts: this.includeTranscripts,
          includeVisualAnalysis: this.includeVisualAnalysis,
          template: this.selectedVideoTemplate
        }
      };

      this.downloadFile(exportData, 'full-analysis-results');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  exportDebugTranscriptions(): void {
    if (!this.transcriptionsData?.transcriptions?.length) {
      alert('No transcription data available to export.');
      return;
    }

    this.isExporting = true;
    
    try {
      // Create export data from debug transcriptions
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportType: 'debug_transcriptions',
          datasetId: this.datasetId,
          source: 'facebook_ads_dashboard_debug'
        },
        summary: this.transcriptionsData.summary || {},
        transcriptions: this.transcriptionsData.transcriptions.map((t: any) => ({
          advertiser: t.advertiser,
          transcriptText: t.transcript_text,
          transcriptLength: t.transcript_length,
          model: t.model,
          duration: t.duration,
          videoUrl: t.video_url,
          adId: t.ad_id,
          confidence: t.confidence,
          language: t.language,
          segments: t.segments || [],
          transcribedAt: t.transcribed_at,
          processingTime: t.processing_time_ms
        }))
      };

      this.downloadFile(exportData, 'debug-transcriptions');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      this.isExporting = false;
    }
  }

  private extractTranscriptData(): any[] {
    // Extract transcript data from bulk analysis results
    // This would need to be adapted based on how transcript data is stored
    if (this.bulkAnalysisResult?.transcripts) {
      return this.bulkAnalysisResult.transcripts;
    }
    
    // If no direct transcript data, create from analysis result
    return [{
      note: 'Transcript data structure may vary - this is extracted from available analysis results',
      analysisIncludedTranscripts: this.includeTranscripts,
      transcriptionStats: this.bulkAnalysisResult?.transcription_stats || {}
    }];
  }

  private downloadFile(data: any, type: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-${this.datasetId || 'analysis'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  }
}
export interface FacebookAd {
  id: string;
  advertiser: {
    name: string;
    verified: boolean;
    id: string;
    category: string;
  };
  creative: {
    body: string;
    title: string;
    description: string;
    call_to_action: string;
    images: string[];
    has_video: boolean;
    video_urls?: string[];
    landing_url?: string;
  };
  targeting: {
    countries: string[];
    age_min: number;
    age_max: number;
    demographics: string;
    interests: string[];
  };
  metrics: {
    impressions_min: number;
    impressions_max: number;
    spend_min: number;
    spend_max: number;
    currency: string;
    cpm: string;
    ctr: string;
  };
  dates: {
    start_date: string;
    end_date: string | null;
    created_date: string;
    last_seen: string;
  };
  metadata: {
    source: string;
    scraped_at: string;
    funding_entity?: string;
    ad_snapshot_url?: string;
    disclaimer?: string;
    apify_run_id?: string;
    is_active: boolean;
    display_format?: string;
    collation_count?: number;
    gated_type?: string;
    raw_fields?: string[];
    note?: string;
  };
}

export interface CompetitorPageData {
  page_name: string;
  page_url: string;
  ads_found: number;
  ads_data: FacebookAd[];
  analyzed_at: string;
  source: string;
  error?: string;
}

export interface FacebookAnalysisResponse {
  success: boolean;
  data: {
    runId: string;
    datasetId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    pageUrls: string[];
    estimated_duration: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
  };
  meta: {
    timestamp: string;
    request_id: string;
  };
}

export interface FacebookAnalysisStatus {
  success: boolean;
  data: {
    runId: string;
    datasetId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: {
      current: number;
      total: number;
      percentage: number;
      message: string;
    };
    pageUrls: string[];
    created_at: string;
    started_at?: string;
    completed_at?: string;
    error?: string;
  };
}

export interface FacebookAnalysisResults {
  success: boolean;
  data: {
    [brandName: string]: CompetitorPageData;
  };
  meta: {
    total_ads: number;
    brands_analyzed: number;
    analysis_duration: string;
    data_sources: string[];
  };
}

export interface ScraperStatus {
  success: boolean;
  data: {
    status: string;
    message: string;
    last_check: string;
    config?: any;
  };
}

export interface AdMetricsSummary {
  total_impressions: number;
  total_spend: number;
  average_cpm: number;
  average_ctr: number;
  ads_count: number;
  top_performers: FacebookAd[];
}

export interface CompetitorComparison {
  brand: string;
  metrics: AdMetricsSummary;
  market_share: number;
  ad_frequency: number;
  creative_types: {
    image: number;
    video: number;
    carousel: number;
  };
}

export interface AnalysisInsights {
  market_overview: {
    total_market_spend: number;
    total_market_impressions: number;
    competitive_intensity: 'Low' | 'Medium' | 'High';
  };
  brand_comparison: CompetitorComparison[];
  trending_topics: string[];
  ad_format_trends: {
    [format: string]: number;
  };
  recommendations: string[];
}

export interface SingleCompetitorAnalysis {
  competitor: CompetitorPageData;
  insights: {
    total_ads: number;
    video_ads: number;
    video_content_rate: number;
    creative_formats: {
      image: number;
      video: number;
      carousel: number;
    };
    messaging_themes: string[];
    top_performing_ads: FacebookAd[];
    recommendations: string[];
  };
  video_analysis?: {
    total_videos: number;
    videos_by_type: {
      [type: string]: number;
    };
    common_themes: string[];
    transcript_insights?: string[];
  };
}
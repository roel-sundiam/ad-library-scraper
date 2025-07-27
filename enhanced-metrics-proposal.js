// Enhanced metrics to replace 0/NaN values in Facebook dashboard

const enhancedMetrics = {
  // REMOVE these zero/NaN metrics:
  removeMetrics: [
    'total_impressions',      // Always 0
    'total_reach',           // Always 0  
    'total_spend',           // Always 0
    'average_cpm',           // Always NaN
    'average_ctr',           // Always NaN
    'impression_range_min',  // Always 0
    'impression_range_max',  // Always 0
  ],

  // REPLACE with meaningful Facebook Ad Library metrics:
  addMetrics: {
    // Content Analysis
    total_ads_found: 'COUNT of ads',
    unique_advertisers: 'COUNT of distinct advertisers',
    video_content_rate: 'PERCENTAGE of ads with video',
    avg_ad_copy_length: 'AVERAGE length of ad text',
    
    // Platform Distribution  
    facebook_ads: 'COUNT of ads on Facebook',
    instagram_ads: 'COUNT of ads on Instagram', 
    audience_network_ads: 'COUNT of ads on Audience Network',
    
    // Campaign Intelligence
    campaign_duration_avg: 'AVERAGE days between start/end dates',
    active_campaigns: 'COUNT of currently active ads',
    historical_campaigns: 'COUNT of taken-down ads',
    
    // Advertiser Insights
    verified_advertisers: 'COUNT of verified pages',
    avg_page_likes: 'AVERAGE follower count',
    top_advertiser_by_volume: 'Advertiser with most ads',
    
    // Creative Strategy
    most_common_cta: 'Most frequent call-to-action',
    unique_landing_domains: 'COUNT of different landing domains',
    content_freshness_score: 'How recently ads were created',
    
    // Competitive Position
    market_share_by_volume: 'Percentage of total ads in dataset',
    advertiser_activity_rank: 'Ranking by ad count',
    platform_strategy_focus: 'Primary platform preference'
  }
};

// Sample enhanced dashboard data structure
const sampleEnhancedData = {
  // Instead of "Total Impressions: 0"
  content_metrics: {
    total_ads_found: 4,
    unique_advertisers: 2,
    video_content_rate: 75, // 3 out of 4 ads have video
    avg_ad_copy_length: 180
  },
  
  // Instead of "Total Spend: $0"  
  platform_distribution: {
    facebook_ads: 4,
    instagram_ads: 3,
    audience_network_ads: 1,
    messenger_ads: 0
  },
  
  // Instead of "Average CPM: NaN"
  campaign_intelligence: {
    campaign_duration_avg: 1, // 1 day campaigns (Aug 2-2)
    active_campaigns: 0,
    historical_campaigns: 4,
    content_freshness: "6 months ago"
  },
  
  // Instead of "Total Reach: 0"
  advertiser_insights: {
    verified_advertisers: 0,
    avg_page_likes: 99,
    top_advertiser: "Kaylee Walter (2 ads)",
    advertiser_diversity: "Low - 2 advertisers"
  },
  
  // New competitive intelligence section
  competitive_analysis: {
    vibriance_market_position: "Sample dataset (4 ads)",
    primary_competitors: ["Kaylee Walter", "Flysmus"],
    creative_strategy: "Video-focused (75%)",
    campaign_style: "Short burst (1-2 days)"
  }
};

module.exports = { enhancedMetrics, sampleEnhancedData };
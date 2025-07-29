# Facebook Ads Analysis Workflow Documentation

## Complete Analysis Phase Process (Post-Scraping)

This document outlines the entire analysis workflow that occurs after scraping Facebook ads data, covering both general analysis and bulk video analysis.

---

## 1. Data Processing & Dashboard Display

### 1.1 Raw Data Processing
After scraping completes, the system processes the raw Facebook ads data:

**Input:** Raw scraped data from Apify/Facebook Ad Library API
**Process:**
- Normalizes data structure across different scraping sources
- Calculates key metrics (total ads, video ads, content rates)
- Processes brand comparisons and market share
- Sorts ads by recency and relevance

**Output:** Structured data ready for dashboard display

```javascript
// Key metrics calculated:
{
  totalAds: 150,
  totalVideoAds: 38,
  videoContentRate: 25.3,
  brandComparisons: [
    {
      brand: "Vibriance",
      metrics: { total_impressions: 25.3, total_spend: 245 },
      ad_frequency: 150,
      creative_types: { image: 112, video: 38, carousel: 0 }
    }
  ]
}
```

### 1.2 Dashboard Visualization
**Components Rendered:**
- **Key Metrics Cards**: Total ads, competitor info, video content rate
- **Competitor Insights**: Statistics grid with performance indicators
- **Recent Ads Grid**: Most recently published ads with preview
- **Video Content Detection**: Identifies and counts video advertisements
- **Analysis Mode Toggle**: Switch between General and Bulk Video Analysis

---

## 2. General AI Analysis Workflow

### 2.1 Custom Analysis Trigger
**User Action:** User enters custom prompt and clicks "Run AI Analysis"

**Frontend Process:**
```typescript
runCustomAnalysis() {
  const analysisRequest = {
    prompt: this.customPrompt,
    workflowId: this.datasetId,
    filters: {
      analysis_type: 'custom_competitor_analysis',
      dashboard_context: true
    }
  };
  
  this.apiService.startAnalysis(analysisRequest).subscribe(...)
}
```

### 2.2 Backend Analysis Processing
**API Endpoint:** `POST /api/analysis/start`

**Process:**
1. **Data Retrieval**: Fetches analysis data using workflow ID
2. **AI Service Selection**: Tries Claude API, falls back to mock if unavailable
3. **Prompt Enhancement**: Combines user prompt with structured data context
4. **AI Analysis**: Processes through Claude API or mock analysis service
5. **Response Formatting**: Structures response for frontend consumption

**Sample AI Prompt Structure:**
```
User Prompt: "Analyze video content strategies across competitors"

Enhanced Context:
COMPETITOR DATA:
- Total Ads: 150
- Video Ads: 38 (25.3%)
- Brand: Vibriance
- Creative Types: 112 image, 38 video, 0 carousel

RECENT AD SAMPLES:
[Structured ad data with text content, dates, formats]

Please provide analysis focusing on: [user prompt]
```

### 2.3 Analysis Response
**Output Format:**
```json
{
  "success": true,
  "data": {
    "analysis": "Detailed AI-generated insights...",
    "metadata": {
      "ai_provider": "claude-3",
      "analysis_type": "custom_competitor_analysis",
      "generated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

## 3. Bulk Video Analysis Workflow

### 3.1 Video Detection & Preparation
**Process:**
1. **Video Ad Identification**: Filters ads where `has_video: true`
2. **Video URL Extraction**: Extracts video URLs from Apify data structure
3. **Data Validation**: Ensures video URLs are accessible
4. **Request Preparation**: Creates analysis request with video metadata

```typescript
// Video data structure from Apify:
const videoAd = {
  id: "ad_123",
  brand: "Vibriance",
  creative: {
    has_video: true,
    video_urls: ["https://video.fbcdn.net/..."],
    videos: [{
      video_hd_url: "https://video.fbcdn.net/hd...",
      video_sd_url: "https://video.fbcdn.net/sd...",
      video_preview_image_url: "https://scontent.fbcdn.net/..."
    }],
    body: "The 'Beauty Serum' That Sold Out 4x Last Year"
  }
}
```

### 3.2 Analysis Request Submission
**Frontend Process:**
```typescript
async startBulkVideoAnalysis() {
  const allVideoAds = this.getAllVideoAds();
  
  const analysisRequest = {
    videos: allVideoAds.map(video => ({
      id: video.id,
      brand: video.brand,
      url: video.creative?.video_urls?.[0],
      text: video.creative?.body || video.creative?.title,
      date: video.dates?.start_date,
      facebook_url: `https://www.facebook.com/ads/library/?id=${video.id}`
    })),
    prompt: this.customPrompt,
    options: {
      includeTranscripts: this.includeTranscripts,
      includeVisualAnalysis: this.includeVisualAnalysis,
      analysisType: this.selectedVideoTemplate || 'custom',
      competitorName: this.brandComparisons[0]?.brand
    },
    workflowId: this.datasetId
  };
  
  const response = await this.apiService.startBulkVideoAnalysis(analysisRequest);
}
```

### 3.3 Backend Bulk Video Processing
**API Endpoint:** `POST /api/videos/bulk-analysis`

**Job Creation:**
```javascript
const analysisJob = {
  job_id: jobId,
  type: 'bulk_video_analysis',
  status: 'queued',
  videos: videos,
  prompt: prompt,
  options: options,
  workflow_id: workflowId,
  progress: { 
    current: 0, 
    total: videos.length, 
    percentage: 0, 
    stage: 'queued',
    message: 'Queued for processing...' 
  }
};
```

**Asynchronous Processing:** `processBulkVideoAnalysis(jobId)`

### 3.4 Stage 1: Video Transcription
**Process (if `includeTranscripts: true`):**

1. **Service Initialization**: Creates VideoTranscriptService instance
2. **Video Processing Loop**: For each video in the dataset
3. **Video Download**: Downloads video file to temporary location
4. **Transcription**: Uses OpenAI Whisper API for speech-to-text
5. **Progress Updates**: Updates job progress for each video

```javascript
// Transcription process:
for (let i = 0; i < job.videos.length; i++) {
  const video = job.videos[i];
  
  // Update progress
  job.progress.current = i + 1;
  job.progress.percentage = Math.round(((i + 1) / job.videos.length) * 50);
  job.progress.message = `Transcribing video ${i + 1}/${job.videos.length}...`;
  
  if (video.url) {
    const transcriptResult = await videoTranscriptService.transcribeVideo(video.url, {
      language: 'en',
      format: 'verbose_json'
    });
    
    transcripts.push({
      video_id: video.id,
      video_text: video.text || '',
      transcript: transcriptResult.transcript,
      confidence: transcriptResult.confidence,
      duration: transcriptResult.duration,
      brand: video.brand
    });
  }
}
```

**Transcription Output Example:**
```json
{
  "transcript": "Discover the amazing benefits of our premium beauty serum. Join thousands of satisfied customers who trust our brand for their skincare needs.",
  "language": "en",
  "duration": 32.5,
  "confidence": 89.2,
  "processing_time_ms": 3420,
  "model": "whisper-1"
}
```

### 3.5 Stage 2: AI Analysis
**Process:**

1. **Data Compilation**: Combines video metadata with transcripts
2. **Prompt Enhancement**: Structures comprehensive analysis prompt
3. **AI Processing**: Uses Claude API for strategic analysis
4. **Response Structuring**: Formats analysis into structured sections

```javascript
// Enhanced analysis prompt:
const analysisPrompt = `${job.prompt}

COMPETITOR: ${job.options.competitorName}
TOTAL VIDEOS ANALYZED: ${job.videos.length}
VIDEOS WITH TRANSCRIPTS: ${transcripts.filter(t => t.transcript).length}

VIDEO DATA:
${videoDataForAnalysis}

Please provide a comprehensive analysis structured as follows:

**EXECUTIVE SUMMARY:**
[2-3 sentence overview of key findings]

**DETAILED ANALYSIS:**
[Comprehensive analysis based on your prompt requirements]

**STRATEGIC RECOMMENDATIONS:**
[3-5 actionable recommendations for competitive advantage]

Focus on providing specific, actionable insights that can inform competitive strategy and creative development.`;
```

### 3.6 Analysis Templates
**Professional Templates Available:**

#### 3.6.1 Complete Video Content Analysis
- **Focus**: Comprehensive analysis of all video elements
- **Covers**: Messaging, visual elements, audio analysis, strategic intelligence
- **Output**: Full competitive video strategy overview

#### 3.6.2 Transcript & Audio Deep Dive
- **Focus**: Spoken content and audio elements
- **Covers**: Messaging patterns, voice analysis, audio branding, CTA analysis
- **Output**: Audio-focused competitive intelligence

#### 3.6.3 Visual & Creative Strategy
- **Focus**: Visual elements and design choices
- **Covers**: Brand identity, cinematography, storytelling, text/graphics
- **Output**: Visual competitive advantages and opportunities

#### 3.6.4 Strategic Competitive Intelligence
- **Focus**: Strategic analysis for competitive positioning
- **Covers**: Market positioning, competitive advantages, gap analysis
- **Output**: Actionable competitive intelligence

#### 3.6.5 Performance & Optimization Insights
- **Focus**: Video performance and optimization strategies
- **Covers**: Content performance, platform optimization, conversion analysis
- **Output**: Performance-driven recommendations

### 3.7 Final Results Compilation
**Structured Output:**
```javascript
const finalResults = {
  summary: "Executive summary extracted from analysis",
  analysis: "Detailed analysis section",
  recommendations: "Strategic recommendations section",
  metadata: {
    total_videos: job.videos.length,
    videos_with_transcripts: transcripts.filter(t => t.transcript).length,
    analysis_type: job.options.analysisType,
    competitor_name: job.options.competitorName,
    ai_provider: 'claude-3',
    generated_at: new Date().toISOString()
  }
};
```

---

## 4. Progress Tracking & Status Updates

### 4.1 Real-time Progress Monitoring
**Frontend Polling:** Every 2 seconds, checks job status

```typescript
private async pollBulkAnalysisProgress(jobId: string) {
  const response = await this.apiService.getBulkAnalysisStatus(jobId);
  
  this.bulkAnalysisProgress = {
    ...this.bulkAnalysisProgress,
    ...response.data,
    percentage: Math.round((response.data.current / response.data.total) * 100)
  };
  
  if (response.data.status === 'completed') {
    this.bulkAnalysisResult = response.data.results;
  } else if (response.data.status !== 'failed') {
    setTimeout(() => this.pollBulkAnalysisProgress(jobId), 2000);
  }
}
```

### 4.2 Progress Stages
**Stage Progression:**
1. **Initializing** (0-5%): Job setup and validation
2. **Transcribing** (5-50%): Video download and transcription
3. **Analyzing** (50-95%): AI analysis processing
4. **Completed** (100%): Results ready for display

**Progress Updates:**
```javascript
// Progress object structure:
{
  stage: 'transcribing',
  message: 'Transcribing video 15/38...',
  current: 15,
  total: 38,
  percentage: 39
}
```

---

## 5. Results Display & Export

### 5.1 Analysis Results Presentation
**UI Components:**
- **Executive Summary**: High-level findings and insights
- **Detailed Analysis**: Comprehensive analysis based on template
- **Strategic Recommendations**: Actionable competitive advantages
- **Metadata Display**: Analysis details and processing information

### 5.2 Export Functionality
**Export Options:**
1. **JSON Report**: Complete analysis data with metadata
2. **Raw Data**: Original video data with analysis results
3. **Summary Report**: Key findings and recommendations

**Export Structure:**
```json
{
  "analysis_type": "bulk_video_analysis",
  "competitor": "Vibriance",
  "generated_at": "2024-01-15T10:30:00Z",
  "total_videos_analyzed": 38,
  "analysis_template": "complete_video_analysis",
  "results": {
    "summary": "...",
    "analysis": "...",
    "recommendations": "..."
  },
  "metadata": {
    "processing_time": "4m 32s",
    "transcription_success_rate": "94.7%",
    "ai_provider": "claude-3"
  }
}
```

---

## 6. Error Handling & Fallbacks

### 6.1 Transcription Fallbacks
**If OpenAI API unavailable:**
- Uses mock transcription with realistic sample data
- Continues analysis with ad text content only
- Provides clear indication of mock vs real data

### 6.2 AI Analysis Fallbacks
**If Claude API unavailable:**
- Falls back to mock analysis service
- Generates template-based structured responses
- Maintains analysis workflow continuity

### 6.3 Data Quality Handling
**Video URL Issues:**
- Gracefully handles missing video URLs
- Falls back to text-only analysis
- Provides clear user messaging about limitations

---

## 7. Performance Considerations

### 7.1 Optimization Strategies
- **Request Size Limits**: 50MB server limit for bulk requests
- **Payload Optimization**: Truncates long text fields to reduce size
- **Asynchronous Processing**: Non-blocking job queue system
- **Progress Streaming**: Real-time updates without blocking UI

### 7.2 Scalability Features
- **In-memory Job Storage**: Fast access to job status
- **Concurrent Processing**: Multiple analysis jobs can run simultaneously
- **Resource Management**: Automatic cleanup of temporary files
- **Rate Limiting**: Respects API rate limits for external services

---

## 8. API Integration Details

### 8.1 OpenAI Whisper Integration
**Configuration:**
```javascript
const transcription = await this.openai.audio.transcriptions.create({
  file: fs.createReadStream(tempFilePath),
  model: 'whisper-1',
  language: 'en',
  response_format: 'verbose_json',
  temperature: 0
});
```

**Cost Calculation:** $0.006 per minute of audio

### 8.2 Claude API Integration
**Configuration:**
```javascript
const claudeService = new ClaudeService();
const analysisResult = await claudeService.analyzeFacebookAds(analysisPrompt, transcripts);
```

**Features:**
- Intelligent prompt structuring
- Context-aware analysis
- Structured response formatting

---

## 9. Mock vs Production Modes

### 9.1 Mock Mode (No API Keys)
**Characteristics:**
- Realistic sample data generation
- Template-based analysis responses
- Fast processing for UI testing
- Clear mock data indicators

### 9.2 Production Mode (With API Keys)
**Characteristics:**
- Real video transcription via OpenAI Whisper
- Genuine AI analysis via Claude
- Actual competitive intelligence generation
- Longer processing times with real progress

---

## 10. Future Enhancements

### 10.1 Planned Features
- **Visual Analysis**: Integration with vision AI for video content analysis
- **Batch Processing**: Handle larger datasets more efficiently
- **Custom Templates**: User-defined analysis templates
- **Historical Tracking**: Compare analysis results over time

### 10.2 Integration Opportunities
- **CRM Integration**: Export insights to customer management systems
- **Reporting Dashboards**: Advanced visualization of competitive data
- **Alert Systems**: Automated notifications for competitive changes
- **API Access**: Programmatic access to analysis capabilities

---

This documentation provides a complete overview of the analysis workflow from data processing through final insights generation, covering both technical implementation and user experience aspects.
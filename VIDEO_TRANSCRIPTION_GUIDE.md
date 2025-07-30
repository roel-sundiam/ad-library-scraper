# Video Transcription Guide

## Overview

This system includes video transcription capabilities using OpenAI's Whisper API to convert video advertisements into text transcripts. However, **video transcription is intentionally disabled by default** to control API costs.

## Current Status: DISABLED

Video transcription is currently **disabled** in all analysis workflows to avoid OpenAI API costs. The system processes video metadata and existing ad text content without transcribing video audio.

### Evidence in Code:
```javascript
// src/api/routes.js:2655-2656 (Custom Analysis)
// src/api/routes.js:3071-3072 (AI Chat)
// Process video transcripts if needed (skip for now to avoid OpenAI costs)
const adsWithTranscripts = adsData; // Skip video transcription until OpenAI key is available
```

## Cost Analysis

### **OpenAI Whisper Pricing**
- **Rate**: $0.006 per minute of audio/video content
- **File Size Limit**: 25MB maximum per video
- **Processing**: Downloads video temporarily, transcribes, then deletes

### **Cost Examples**

| Scenario | Video Count | Avg Length | Estimated Cost |
|----------|-------------|------------|----------------|
| Small Analysis | 50 videos | 30 seconds | $0.15 |
| Medium Analysis | 200 videos | 45 seconds | $0.90 |
| Large Analysis | 500 videos | 60 seconds | $3.00 |
| Enterprise Analysis | 1000+ videos | 45 seconds | $4.50+ |

### **Bulk Analysis Impact**
- Typical competitor analysis processes **100-1000+ video ads**
- With transcription enabled: **$0.50-$10.00+ per analysis**
- Without transcription: **$0.05-$0.20 per analysis** (text analysis only)

## Technical Implementation

### **Video Transcription Service**
- **Location**: `src/services/video-transcript-service.js`
- **Features**: Real transcription (OpenAI) + Mock mode fallback
- **Rate Limiting**: Built-in delays to avoid API limits
- **Error Handling**: Graceful fallback for failed transcriptions

### **Debug Tools Available**
1. **View Transcriptions**: `/api/debug/videos/transcriptions`
2. **Test Transcription**: `/api/debug/videos/test`  
3. **Video URLs Discovery**: `/api/debug/videos/ads`

### **Current Processing Flow**
```
Video Ad Detected → Extract Metadata → Skip Transcription → Use Existing Text → AI Analysis
```

### **With Transcription Enabled**
```
Video Ad Detected → Download Video → Transcribe with Whisper → Store Transcript → AI Analysis
```

## Enabling Video Transcription

### **Prerequisites**
- ✅ OpenAI API Key configured (`OPENAI_API_KEY` in `.env`)
- ✅ Sufficient OpenAI API credits
- ✅ Budget planning for transcription costs

### **Configuration Changes Required**

#### 1. Enable in Custom Analysis (`src/api/routes.js:2655`)
```javascript
// BEFORE (Disabled)
const adsWithTranscripts = adsData; // Skip video transcription

// AFTER (Enabled)
const adsWithTranscripts = await processVideoTranscripts(adsData);
```

#### 2. Enable in AI Chat (`src/api/routes.js:3071`)
```javascript
// BEFORE (Disabled)  
const adsWithTranscripts = adsData; // Skip video transcription

// AFTER (Enabled)
const adsWithTranscripts = await processVideoTranscripts(adsData);
```

#### 3. Add to Bulk Video Analysis (`src/api/routes.js:3520+`)
Currently bulk video analysis processes video metadata only. To add transcription:

```javascript
// After videosToAnalyze preparation (around line 3530)
if (enableTranscription) {
  const videoService = getVideoTranscriptService();
  for (const video of videosToAnalyze) {
    if (video.video_urls?.length > 0) {
      try {
        const transcript = await videoService.transcribeVideo(video.video_urls[0]);
        video.transcript = transcript.transcript;
      } catch (error) {
        logger.warn('Video transcription failed:', error);
      }
    }
  }
}
```

### **Cost Control Features**

#### 1. **Video Limit per Ad**
```javascript
// Limit transcription to first 3 videos per ad to control costs
const videosToTranscribe = ad.creative.video_urls.slice(0, 3);
```

#### 2. **File Size Validation**
```javascript
// Check file size limit (25MB for Whisper)
if (videoStats.size > 25 * 1024 * 1024) {
  throw new Error(`Video file too large: ${fileSizeMB}MB (max 25MB)`);
}
```

#### 3. **Cost Estimation**
```javascript
// Built-in cost calculator
const costInfo = await videoService.getTranscriptionCost(durationSeconds);
// Returns: { estimated_cost_usd, duration_minutes, price_per_minute }
```

## Recommendations

### **For Development/Testing**
- ✅ Use mock transcription mode (no API costs)
- ✅ Test with small video batches (5-10 videos)
- ✅ Monitor costs in OpenAI dashboard

### **For Production Use**
- ⚠️ **Carefully consider ROI** - Does transcribed video content provide significantly better insights?
- ⚠️ **Set usage limits** - Implement daily/monthly spend caps
- ⚠️ **User warnings** - Notify users about transcription costs before processing
- ⚠️ **Selective transcription** - Only transcribe videos when specifically requested

### **Alternative Approaches**
1. **Hybrid Mode**: Transcribe only high-priority competitors or recent ads
2. **On-Demand**: Let users choose whether to enable transcription per analysis
3. **Batch Processing**: Process transcriptions during off-peak hours with cost limits

## Debug and Monitoring

### **Check Transcription Status**
```bash
# Test video transcription service
curl -X GET "http://localhost:3000/api/debug/videos/test?url=VIDEO_URL"

# View existing transcriptions
curl -X GET "http://localhost:3000/api/debug/videos/transcriptions"

# Check video ads in workflow
curl -X GET "http://localhost:3000/api/debug/videos/ads"
```

### **Monitor Costs**
- OpenAI API Dashboard: Usage and billing
- Application logs: Processing times and video counts
- Database: Track transcription success/failure rates

## Conclusion

Video transcription is a powerful feature that can provide deeper insights into competitor video advertising strategies. However, the costs scale significantly with the number of videos processed. The current implementation intentionally disables transcription to provide predictable, low-cost competitor analysis focused on existing ad text content and metadata.

**Enable transcription only when the additional insights justify the increased API costs.**

---

*Last Updated: July 30, 2025*  
*Related Files: `src/services/video-transcript-service.js`, `src/api/routes.js`*
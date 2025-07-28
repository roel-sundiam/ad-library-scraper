const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

// Optional dependencies - gracefully handle missing packages
let OpenAI;
let axios;

try {
  OpenAI = require('openai');
} catch (e) {
  logger.warn('OpenAI not available:', e.message);
}

try {
  axios = require('axios');
} catch (e) {
  logger.warn('axios not available:', e.message);
}

class VideoTranscriptService {
  constructor() {
    if (OpenAI && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      logger.warn('OpenAI not configured - transcription will be mocked');
      this.openai = null;
    }
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.ensureDir(this.tempDir);
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  async transcribeVideo(videoUrl, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('[MOCK/REAL] Starting video transcription', {
        videoUrl: videoUrl.substring(0, 100) + '...',
        options,
        hasOpenAI: !!this.openai
      });

      // If OpenAI is not configured, return mock transcription
      if (!this.openai) {
        logger.info('Returning mock transcription data');
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const mockTranscripts = [
          "Discover the amazing benefits of our premium quality products. Join thousands of satisfied customers who trust our brand.",
          "Experience innovation like never before. Our cutting-edge technology delivers exceptional results every time.",
          "Don't miss out on this limited-time offer. Get yours today and see the difference quality makes.",
          "Transform your lifestyle with our award-winning solutions. Trusted by professionals worldwide.",
          "Join the revolution of customers who choose excellence. Order now and experience the premium difference."
        ];
        
        const mockTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        const duration = Date.now() - startTime;
        
        return {
          transcript: mockTranscript,
          language: 'en',
          duration: 25 + Math.random() * 35, // 25-60 seconds
          segments: [{
            start: 0,
            end: 30,
            text: mockTranscript,
            avg_logprob: -0.3
          }],
          confidence: 85 + Math.random() * 10, // 85-95%
          processing_time_ms: duration,
          file_size_mb: '2.5',
          model: 'mock-whisper-1',
          transcribed_at: new Date().toISOString(),
          note: 'Mock transcription for UI testing'
        };
      }

      // Real OpenAI transcription (if available)
      let tempFilePath = null;
      
      // Download video to temporary file
      tempFilePath = await this.downloadVideo(videoUrl);
      
      // Get video metadata
      const videoStats = await fs.stat(tempFilePath);
      const fileSizeMB = (videoStats.size / (1024 * 1024)).toFixed(2);
      
      logger.info('Video downloaded for transcription', {
        filePath: tempFilePath,
        sizeMB: fileSizeMB
      });

      // Check file size limit (25MB for Whisper)
      if (videoStats.size > 25 * 1024 * 1024) {
        throw new Error(`Video file too large: ${fileSizeMB}MB (max 25MB)`);
      }

      // Transcribe using OpenAI Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: options.format || 'verbose_json',
        temperature: options.temperature || 0
      });

      const duration = Date.now() - startTime;
      
      const result = {
        transcript: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments || [],
        confidence: this.calculateAverageConfidence(transcription.segments),
        processing_time_ms: duration,
        file_size_mb: fileSizeMB,
        model: 'whisper-1',
        transcribed_at: new Date().toISOString()
      };

      logger.info('Video transcription completed', {
        transcript_length: result.transcript.length,
        duration: result.duration,
        confidence: result.confidence,
        processing_time: duration
      });

      // Clean up temporary file
      if (tempFilePath) {
        try {
          await fs.remove(tempFilePath);
          logger.debug('Temporary video file cleaned up:', tempFilePath);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp file:', cleanupError);
        }
      }

      return result;

    } catch (error) {
      logger.error('Video transcription failed:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await fs.remove(tempFilePath);
          logger.debug('Temporary video file cleaned up:', tempFilePath);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp file:', cleanupError);
        }
      }
    }
  }

  async downloadVideo(videoUrl) {
    if (!axios) {
      throw new Error('axios not available for video download');
    }

    const fileName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
    const filePath = path.join(this.tempDir, fileName);

    try {
      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: 60000, // 60 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });

    } catch (error) {
      logger.error('Video download failed:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  calculateAverageConfidence(segments) {
    if (!segments || segments.length === 0) return null;
    
    const totalConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || 0);
    }, 0);
    
    // Convert log probability to approximate confidence percentage
    const avgLogProb = totalConfidence / segments.length;
    const confidence = Math.min(Math.max((Math.exp(avgLogProb) * 100), 0), 100);
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  async testConnection() {
    try {
      if (!this.openai) {
        return {
          success: false,
          message: 'OpenAI not configured - using mock transcription',
          model_available: false,
          api_key_configured: !!process.env.OPENAI_API_KEY,
          mock_mode: true
        };
      }

      // Test with a simple audio file creation (not actual transcription)
      const models = await this.openai.models.list();
      const whisperModel = models.data.find(model => model.id === 'whisper-1');
      
      return {
        success: true,
        message: 'OpenAI Whisper connection successful',
        model_available: !!whisperModel,
        api_key_configured: !!process.env.OPENAI_API_KEY,
        mock_mode: false
      };
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return {
        success: false,
        error: error.message,
        api_key_configured: !!process.env.OPENAI_API_KEY,
        mock_mode: !this.openai
      };
    }
  }

  async getTranscriptionCost(durationSeconds) {
    // OpenAI Whisper pricing: $0.006 per minute
    const minutes = Math.ceil(durationSeconds / 60);
    const cost = minutes * 0.006;
    
    return {
      duration_seconds: durationSeconds,
      duration_minutes: minutes,
      estimated_cost_usd: Math.round(cost * 1000) / 1000, // Round to 3 decimal places
      pricing_model: 'whisper-1',
      price_per_minute: 0.006
    };
  }

  // Batch process multiple videos
  async transcribeMultipleVideos(videoUrls, options = {}) {
    const results = [];
    const errors = [];

    for (const [index, videoUrl] of videoUrls.entries()) {
      try {
        logger.info(`Processing video ${index + 1}/${videoUrls.length}`, { videoUrl });
        
        const result = await this.transcribeVideo(videoUrl, options);
        results.push({
          video_url: videoUrl,
          success: true,
          ...result
        });

        // Add delay between requests to avoid rate limiting
        if (index < videoUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        logger.error(`Failed to process video ${index + 1}:`, error);
        errors.push({
          video_url: videoUrl,
          success: false,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      summary: {
        total_videos: videoUrls.length,
        successful: results.length,
        failed: errors.length,
        success_rate: Math.round((results.length / videoUrls.length) * 100)
      }
    };
  }
}

module.exports = VideoTranscriptService;
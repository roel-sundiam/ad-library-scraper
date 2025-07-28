import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

interface VideoAnalysisTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'content' | 'visual' | 'competitive' | 'technical';
}

interface BulkAnalysisJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
    message: string;
  };
  results?: any;
  error?: string;
}

@Component({
  selector: 'app-bulk-video-analysis',
  templateUrl: './bulk-video-analysis.component.html',
  styleUrls: ['./bulk-video-analysis.component.scss']
})
export class BulkVideoAnalysisComponent implements OnInit {
  @Input() videos: any[] = [];
  @Input() totalVideoCount: number = 0;
  @Output() analysisComplete = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  // Analysis configuration
  selectedTemplates: string[] = [];
  customPrompt: string = '';
  includeTranscripts: boolean = true;
  includeVisualAnalysis: boolean = true;
  filterByBrand: string = 'all';
  filterByDateRange: { start: string; end: string } = { start: '', end: '' };

  // Job tracking
  currentJob: BulkAnalysisJob | null = null;
  isAnalyzing: boolean = false;
  showResults: boolean = false;

  // Available brands for filtering
  availableBrands: string[] = [];

  // Pre-defined analysis templates
  analysisTemplates: VideoAnalysisTemplate[] = [
    {
      id: 'content_analysis',
      name: 'Content & Messaging Analysis',
      description: 'Analyze video messaging, storytelling techniques, and call-to-actions',
      prompt: `Analyze the content and messaging strategy of these competitor videos:

1. **Messaging Themes**: What are the dominant messaging themes and value propositions?
2. **Storytelling Techniques**: What narrative structures and storytelling approaches are used?
3. **Call-to-Actions**: What CTAs are used and how are they positioned?
4. **Target Audience**: What audience segments do these videos target?
5. **Emotional Appeals**: What emotional triggers and appeals are employed?

Focus on identifying patterns, trends, and opportunities for differentiation.`,
      category: 'content'
    },
    {
      id: 'visual_analysis',
      name: 'Visual & Creative Analysis',
      description: 'Examine visual elements, design trends, and creative formats',
      prompt: `Conduct a comprehensive visual and creative analysis of these competitor videos:

1. **Visual Style**: What visual styles, color schemes, and design aesthetics are prevalent?
2. **Creative Formats**: What video formats, lengths, and structures are most common?
3. **Branding Elements**: How are logos, brand colors, and visual identity integrated?
4. **Text Overlays**: What text overlay strategies and typography choices are used?
5. **Scene Composition**: What compositional techniques and visual hierarchy patterns emerge?

Identify creative trends and gaps in the market for visual differentiation.`,
      category: 'visual'
    },
    {
      id: 'competitive_intelligence',
      name: 'Competitive Intelligence Report',
      description: 'Strategic analysis of competitive positioning and market opportunities',
      prompt: `Generate a competitive intelligence report analyzing these competitor videos:

1. **Market Positioning**: How do competitors position themselves in the market?
2. **Competitive Gaps**: What messaging or creative gaps exist in the competitive landscape?
3. **Market Trends**: What trends in video advertising are emerging across competitors?
4. **Strategic Opportunities**: What opportunities exist for differentiation and competitive advantage?
5. **Threat Assessment**: What competitive threats and challenges should be considered?

Provide actionable strategic recommendations based on the analysis.`,
      category: 'competitive'
    },
    {
      id: 'transcript_analysis',
      name: 'Audio & Transcript Analysis',
      description: 'Deep dive into spoken content, voiceovers, and audio messaging',
      prompt: `Analyze the audio content and transcripts from these competitor videos:

1. **Spoken Messaging**: What key messages are communicated through voiceovers and dialogue?
2. **Tone & Voice**: What tone of voice and personality traits are expressed?
3. **Audio Branding**: How do competitors use music, sound effects, and audio branding?
4. **Script Patterns**: What script structures and speaking patterns are common?
5. **Persuasion Techniques**: What verbal persuasion and influence techniques are employed?

Focus on audio-specific insights that complement visual analysis.`,
      category: 'content'
    },
    {
      id: 'technical_analysis',
      name: 'Technical & Performance Analysis',
      description: 'Analysis of video technical specifications and performance indicators',
      prompt: `Conduct a technical analysis of these competitor videos:

1. **Video Specifications**: What are the common video lengths, formats, and quality standards?
2. **Publishing Patterns**: When and how frequently are videos published?
3. **Platform Optimization**: How are videos optimized for different platforms and placements?
4. **Performance Indicators**: What patterns emerge in video engagement and performance?
5. **Technical Trends**: What technical innovations or trends are competitors adopting?

Provide insights for technical optimization and competitive benchmarking.`,
      category: 'technical'
    }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.extractAvailableBrands();
  }

  extractAvailableBrands(): void {
    const brands = new Set<string>();
    this.videos.forEach(video => {
      if (video.brand) {
        brands.add(video.brand);
      }
    });
    this.availableBrands = Array.from(brands).sort();
  }

  toggleTemplate(templateId: string): void {
    const index = this.selectedTemplates.indexOf(templateId);
    if (index === -1) {
      this.selectedTemplates.push(templateId);
    } else {
      this.selectedTemplates.splice(index, 1);
    }
  }

  isTemplateSelected(templateId: string): boolean {
    return this.selectedTemplates.includes(templateId);
  }

  getSelectedTemplateCount(): number {
    return this.selectedTemplates.length;
  }

  getFilteredVideos(): any[] {
    let filtered = [...this.videos];

    // Filter by brand
    if (this.filterByBrand !== 'all') {
      filtered = filtered.filter(video => video.brand === this.filterByBrand);
    }

    // Filter by date range
    if (this.filterByDateRange.start) {
      const startDate = new Date(this.filterByDateRange.start);
      filtered = filtered.filter(video => {
        const videoDate = new Date(video.dates?.start_date);
        return videoDate >= startDate;
      });
    }

    if (this.filterByDateRange.end) {
      const endDate = new Date(this.filterByDateRange.end);
      filtered = filtered.filter(video => {
        const videoDate = new Date(video.dates?.start_date);
        return videoDate <= endDate;
      });
    }

    return filtered;
  }

  getFilteredVideoCount(): number {
    return this.getFilteredVideos().length;
  }

  async startBulkAnalysis(): Promise<void> {
    if (this.isAnalyzing) return;

    const filteredVideos = this.getFilteredVideos();
    if (filteredVideos.length === 0) {
      alert('No videos match the current filters. Please adjust your filters and try again.');
      return;
    }

    if (this.selectedTemplates.length === 0 && !this.customPrompt.trim()) {
      alert('Please select at least one analysis template or enter a custom prompt.');
      return;
    }

    this.isAnalyzing = true;
    this.showResults = false;

    try {
      // Prepare analysis request
      const analysisRequest = {
        videos: filteredVideos.map(video => ({
          id: video.id,
          brand: video.brand,
          url: video.creative?.video_urls?.[0],
          text: video.creative?.body || video.creative?.title,
          date: video.dates?.start_date,
          facebook_url: `https://www.facebook.com/ads/library/?id=${video.id}`
        })),
        templates: this.selectedTemplates.map(templateId => 
          this.analysisTemplates.find(t => t.id === templateId)
        ).filter(Boolean),
        customPrompt: this.customPrompt.trim(),
        options: {
          includeTranscripts: this.includeTranscripts,
          includeVisualAnalysis: this.includeVisualAnalysis,
          filterByBrand: this.filterByBrand,
          dateRange: this.filterByDateRange
        }
      };

      // Start bulk analysis job
      const response = await this.apiService.startBulkVideoAnalysis(analysisRequest).toPromise();
      
      if (response.success) {
        this.currentJob = {
          jobId: response.data.jobId,
          status: 'queued',
          progress: {
            current: 0,
            total: filteredVideos.length,
            percentage: 0,
            message: 'Initializing analysis...'
          }
        };

        // Start polling for progress updates
        this.pollAnalysisProgress();
      } else {
        throw new Error(response.error?.message || 'Failed to start analysis');
      }

    } catch (error) {
      console.error('Bulk analysis failed:', error);
      this.isAnalyzing = false;
      alert('Failed to start bulk analysis. Please try again.');
    }
  }

  private async pollAnalysisProgress(): Promise<void> {
    if (!this.currentJob) return;

    try {
      const response = await this.apiService.getBulkAnalysisStatus(this.currentJob.jobId).toPromise();
      
      if (response.success) {
        this.currentJob = { ...this.currentJob, ...response.data };

        if (this.currentJob.status === 'completed') {
          this.isAnalyzing = false;
          this.showResults = true;
          this.analysisComplete.emit(this.currentJob.results);
        } else if (this.currentJob.status === 'failed') {
          this.isAnalyzing = false;
          alert('Analysis failed: ' + (this.currentJob.error || 'Unknown error'));
        } else {
          // Continue polling
          setTimeout(() => this.pollAnalysisProgress(), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to get analysis status:', error);
      this.isAnalyzing = false;
      alert('Failed to track analysis progress.');
    }
  }

  cancelAnalysis(): void {
    if (this.currentJob && this.isAnalyzing) {
      // TODO: Implement cancel API call
      this.isAnalyzing = false;
      this.currentJob = null;
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  downloadReport(): void {
    if (this.currentJob?.results) {
      const blob = new Blob([JSON.stringify(this.currentJob.results, null, 2)], {
        type: 'application/json'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk-video-analysis-${this.currentJob.jobId}-${Date.now()}.json`;
      link.click();
      
      window.URL.revokeObjectURL(url);
    }
  }
}
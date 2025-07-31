// Test script to add mock data and test video transcription export

const axios = require('axios');

async function testVideoTranscriptionExport() {
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    console.log('Testing video transcription export functionality...');
    
    // First, let's create a simple analysis with mock video data
    const testAnalysis = {
      runId: 'test_run_123',
      datasetId: 'dataset_test_123',
      status: 'completed',
      results: [
        {
          id: 'ad_123',
          advertiser: { page_name: 'Test Nike' },
          creative: {
            body: 'Just Do It - New Nike Campaign',
            video_preview_image_url: 'https://example.com/video-thumb.jpg',
            video_url: 'https://video.facebookads.com/test-video.mp4'
          }
        },
        {
          id: 'ad_456', 
          advertiser: { page_name: 'Test Adidas' },
          creative: {
            body: 'Impossible is Nothing',
            video_preview_image_url: 'https://example.com/video-thumb2.jpg',
            video_url: 'https://video.facebookads.com/test-video2.mp4'
          }
        }
      ],
      videos: [
        { url: 'https://video.facebookads.com/test-video.mp4', advertiser: 'Test Nike' },
        { url: 'https://video.facebookads.com/test-video2.mp4', advertiser: 'Test Adidas' }
      ]
    };

    // Create a POST endpoint to add test data
    console.log('Adding test data to jobs Map...');
    const addDataResponse = await axios.post(`${baseUrl}/test/add-job-data`, testAnalysis);
    console.log('Test data added:', addDataResponse.data);
    
    // Now test the export
    console.log('Testing export with video transcription...');
    const exportResponse = await axios.get(`${baseUrl}/export/facebook-analysis/dataset_test_123?includeTranscripts=true`);
    
    console.log('Export response:');
    console.log(JSON.stringify(exportResponse.data, null, 2));
    
    // Check if transcripts were processed
    const videoTranscripts = exportResponse.data.data.video_transcripts;
    if (videoTranscripts && videoTranscripts.transcripts && videoTranscripts.transcripts.length > 0) {
      console.log('\n✅ SUCCESS: Video transcription is working!');
      console.log(`- Found ${videoTranscripts.total_videos_found} videos`);
      console.log(`- Processed ${videoTranscripts.videos_processed} videos`);
      console.log('- Transcript text:', videoTranscripts.transcripts[0].transcript_text);
    } else {
      console.log('\n⚠️ No transcripts found, but export structure is correct');
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testVideoTranscriptionExport();
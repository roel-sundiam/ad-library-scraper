require('dotenv').config();
const https = require('https');

async function getRunLogs(runId) {
  const apiToken = process.env.APIFY_API_TOKEN;
  const url = `https://api.apify.com/v2/actor-runs/${runId}/log`;
  
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    };

    https.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log(`\n=== LOGS for run ${runId} ===`);
        console.log(data);
        resolve(data);
      });
    }).on('error', reject);
  });
}

// Get logs from the most recent run IDs from our test
// Replace these with actual run IDs from the latest test output
const recentRunIds = [
  'h9YSX1Zl1CQvYaqew', // Format 1
  'sVnYHOQR1IqX9tp0g'  // Format 5 (last one we saw)
];

async function debugRuns() {
  console.log('Fetching run logs to debug why premium actor returns 0 results...\n');
  
  for (const runId of recentRunIds) {
    try {
      await getRunLogs(runId);
    } catch (error) {
      console.error(`Failed to get logs for ${runId}:`, error.message);
    }
  }
}

debugRuns().then(() => {
  console.log('\n=== Debug completed ===');
}).catch(console.error);
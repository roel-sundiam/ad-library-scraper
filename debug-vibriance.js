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
        console.log(`\n=== LOGS for Vibriance run ${runId} ===`);
        console.log(data);
        resolve(data);
      });
    }).on('error', reject);
  });
}

// Test Vibriance specifically and get detailed logs
async function debugVibriance() {
  console.log('Testing Vibriance specifically...\n');
  
  const ApifyScraper = require('./src/scrapers/apify-scraper');
  const scraper = new ApifyScraper();
  
  try {
    const results = await scraper.scrapeAds({
      query: 'Vibriance',
      country: 'US',
      limit: 50  // Try higher limit
    });
    
    console.log(`\nVibriance results: ${results.length} ads found`);
    
    // Get the most recent run ID from logs and fetch detailed logs
    // Run ID was: Dv75oO6ZKDLMorgmw from previous test
    await getRunLogs('Dv75oO6ZKDLMorgmw');
    
  } catch (error) {
    console.error('Error testing Vibriance:', error.message);
  }
}

debugVibriance().catch(console.error);
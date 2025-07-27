require('dotenv').config();
const https = require('https');

async function getActorDetails() {
  console.log('🔍 Getting actor details for jj5sAMeSoXotatkss...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  try {
    // Get actor information
    const actorInfo = await getActorInfo(apiToken, actorId);
    console.log('=== ACTOR INFO ===');
    console.log('Name:', actorInfo.name);
    console.log('Title:', actorInfo.title);
    console.log('Description:', actorInfo.description);
    console.log('Version:', actorInfo.version);
    console.log('Username:', actorInfo.username);
    
    // Get input schema to understand parameters
    if (actorInfo.versions && actorInfo.versions.length > 0) {
      const latestVersion = actorInfo.versions[0];
      console.log('\n=== INPUT SCHEMA ===');
      if (latestVersion.inputSchema) {
        console.log('Input schema:', JSON.stringify(latestVersion.inputSchema, null, 2));
      } else {
        console.log('No input schema found');
      }
    }
    
    // Get recent runs to see what parameters were used
    console.log('\n=== RECENT RUNS ===');
    const runs = await getRecentRuns(apiToken, actorId);
    if (runs && runs.length > 0) {
      runs.slice(0, 3).forEach((run, index) => {
        console.log(`\nRun ${index + 1}:`);
        console.log('Status:', run.status);
        console.log('Started:', run.startedAt);
        console.log('Stats:', run.stats);
        if (run.options?.input) {
          console.log('Input parameters:', JSON.stringify(run.options.input, null, 2));
        }
      });
    }
    
  } catch (error) {
    console.error('Failed to get actor details:', error.message);
  }
}

function getActorInfo(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data) {
            resolve(result.data);
          } else {
            reject(new Error('No actor data returned'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getRecentRuns(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}/runs?limit=5`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data?.items || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

getActorDetails().catch(console.error);
require('dotenv').config();
const https = require('https');

async function deepActorInvestigation() {
  console.log('🔍 Deep investigation of jj5sAMeSoXotatkss capabilities...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  const actorId = 'jj5sAMeSoXotatkss';
  
  try {
    // Get the actor's complete information including builds and versions
    console.log('=== GETTING ACTOR DETAILS ===');
    const actorInfo = await getActorInfo(apiToken, actorId);
    
    console.log('Actor Name:', actorInfo.name);
    console.log('Description:', actorInfo.description);
    console.log('Public:', actorInfo.isPublic);
    console.log('Latest Version:', actorInfo.version);
    
    // Get the latest build to see actual parameters
    if (actorInfo.builds && actorInfo.builds.length > 0) {
      console.log('\n=== LATEST BUILD INFO ===');
      const latestBuild = actorInfo.builds[0];
      console.log('Build ID:', latestBuild.id);
      console.log('Status:', latestBuild.status);
      console.log('Started:', latestBuild.startedAt);
      console.log('Log available:', !!latestBuild.log);
    }
    
    // Try to get input schema from different sources
    console.log('\n=== SEARCHING FOR INPUT SCHEMA ===');
    
    // Method 1: From actor info
    if (actorInfo.inputSchema) {
      console.log('Input schema found in actor info:');
      console.log(JSON.stringify(actorInfo.inputSchema, null, 2));
    }
    
    // Method 2: From latest version
    if (actorInfo.versions && actorInfo.versions.length > 0) {
      const latestVersion = actorInfo.versions[0];
      console.log('\nLatest version info:');
      console.log('Version:', latestVersion.versionNumber);
      console.log('Build tag:', latestVersion.buildTag);
      
      if (latestVersion.inputSchema) {
        console.log('Input schema from version:');
        console.log(JSON.stringify(latestVersion.inputSchema, null, 2));
      }
    }
    
    // Method 3: Check if there's a public store page we can access
    console.log('\n=== CHECKING PUBLIC STORE INFO ===');
    const storeInfo = await getStoreInfo(actorId);
    if (storeInfo) {
      console.log('Store info found:', storeInfo);
    }
    
    // Method 4: Get successful runs to see what parameters were actually used
    console.log('\n=== ANALYZING SUCCESSFUL RUNS ===');
    const runs = await getRecentRuns(apiToken, actorId);
    if (runs && runs.length > 0) {
      console.log(`Found ${runs.length} recent runs`);
      
      runs.slice(0, 5).forEach((run, index) => {
        console.log(`\nRun ${index + 1}:`);
        console.log('Status:', run.status);
        console.log('Started:', run.startedAt);
        console.log('Finished:', run.finishedAt);
        console.log('Duration:', run.runTimeSecs ? `${run.runTimeSecs}s` : 'N/A');
        console.log('Compute units:', run.defaultDatasetItemCount || 'N/A');
        
        // Try to get the input that was used
        if (run.id) {
          getRunInput(apiToken, run.id).then(input => {
            if (input) {
              console.log(`Input for run ${index + 1}:`, JSON.stringify(input, null, 2));
            }
          }).catch(() => {});
        }
      });
    }
    
  } catch (error) {
    console.error('Investigation failed:', error.message);
  }
}

function getActorInfo(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}?includeBuilds=1&includeVersions=1`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getRecentRuns(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}/runs?limit=10&status=SUCCEEDED`;
  
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

function getRunInput(apiToken, runId) {
  const url = `https://api.apify.com/v2/actor-runs/${runId}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data?.options?.input || null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function getStoreInfo(actorId) {
  // Try to get public store info
  const url = `https://api.apify.com/v2/store/items/${actorId}`;
  
  return new Promise((resolve) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.data);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

deepActorInvestigation().catch(console.error);
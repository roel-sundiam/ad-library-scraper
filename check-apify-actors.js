const https = require('https');

// Test which Apify actors actually exist
const actors = [
  'trudax/facebook-ad-library-scraper',
  'natasha.lekh/facebook-ad-library-scraper',
  'drobnikj/facebook-ad-library-scraper', 
  'lukaskrivka/facebook-ad-library-scraper',
  'apify/web-scraper'
];

async function checkActor(actorName) {
  return new Promise((resolve) => {
    const url = `https://api.apify.com/v2/acts/${actorName}`;
    
    https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          const exists = response.statusCode === 200;
          const info = exists ? {
            name: result.data?.name || 'Unknown',
            lastModified: result.data?.modifiedAt?.substring(0, 10) || 'Unknown',
            stats: result.data?.stats || {}
          } : null;
          
          resolve({ actorName, exists, info, statusCode: response.statusCode });
        } catch (error) {
          resolve({ actorName, exists: false, error: error.message, statusCode: response.statusCode });
        }
      });
    }).on('error', (error) => {
      resolve({ actorName, exists: false, error: error.message });
    });
  });
}

async function checkAllActors() {
  console.log('=== Checking Apify Actors ===\n');
  
  for (const actor of actors) {
    const result = await checkActor(actor);
    
    console.log(`Actor: ${actor}`);
    console.log(`  Status: ${result.exists ? '✅ EXISTS' : '❌ NOT FOUND'} (${result.statusCode || 'ERROR'})`);
    
    if (result.exists && result.info) {
      console.log(`  Name: ${result.info.name}`);
      console.log(`  Last Modified: ${result.info.lastModified}`);
      console.log(`  Runs: ${result.info.stats.totalRuns || 0} total`);
    } else if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }
}

checkAllActors().then(() => {
  console.log('=== Actor check completed ===');
}).catch(error => {
  console.error('Failed to check actors:', error);
});
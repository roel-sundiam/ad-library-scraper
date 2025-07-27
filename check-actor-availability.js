require('dotenv').config();
const https = require('https');

async function checkActorAvailability() {
  console.log('🔍 Checking availability of alternative actors...\n');
  
  const apiToken = process.env.APIFY_API_TOKEN;
  
  const actorsToTest = [
    'curious_coder/facebook-ads-library-scraper',
    'XtaWFhbtfxyzqrFmd',  // Original actor ID format
    'insight_api_labs/facebook-ad-library',
    'igolaizola/facebook-ad-library-scraper',
    'jj5sAMeSoXotatkss'   // Our working actor
  ];
  
  for (const actorId of actorsToTest) {
    try {
      console.log(`Testing actor: ${actorId}`);
      
      const exists = await checkActorExists(apiToken, actorId);
      
      if (exists) {
        console.log(`✅ ${actorId} - ACCESSIBLE`);
        
        // Try to get more info about the actor
        const info = await getActorInfo(apiToken, actorId);
        if (info) {
          console.log(`   Name: ${info.name || 'Unknown'}`);
          console.log(`   Public: ${info.isPublic ? 'Yes' : 'No'}`);
          console.log(`   Owner: ${info.username || 'Unknown'}`);
        }
      } else {
        console.log(`❌ ${actorId} - NOT ACCESSIBLE (404)`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ ${actorId} - ERROR: ${error.message}\n`);
    }
  }
}

function checkActorExists(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}`;
  
  return new Promise((resolve) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 5000
    };

    https.get(url, options, (response) => {
      resolve(response.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    }).on('timeout', () => {
      resolve(false);
    });
  });
}

function getActorInfo(apiToken, actorId) {
  const url = `https://api.apify.com/v2/acts/${actorId}`;
  
  return new Promise((resolve) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 5000
    };

    https.get(url, options, (response) => {
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
    }).on('error', () => resolve(null))
      .on('timeout', () => resolve(null));
  });
}

checkActorAvailability().catch(console.error);
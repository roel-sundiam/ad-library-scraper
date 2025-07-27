const ApifyScraper = require('./src/scrapers/apify-scraper');

async function debugRawApify() {
  console.log('🔍 Debugging raw Apify data structure...\n');
  
  const scraper = new ApifyScraper();
  
  if (!process.env.APIFY_API_TOKEN) {
    console.log('❌ APIFY_API_TOKEN not found in environment');
    return;
  }
  
  try {
    // Temporarily override the normalization to see raw data
    const originalNormalize = scraper.normalizeApifyData;
    scraper.normalizeApifyData = function(data, scraperName) {
      console.log('\n=== RAW APIFY DATA STRUCTURE ===');
      console.log(`Raw data type: ${typeof data}`);
      console.log(`Raw data length: ${Array.isArray(data) ? data.length : 'not array'}`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('\n--- First Item Raw Structure ---');
        const firstItem = data[0];
        console.log('Top-level keys:', Object.keys(firstItem));
        
        // Show first few characters of each field value
        Object.keys(firstItem).forEach(key => {
          const value = firstItem[key];
          if (typeof value === 'string') {
            console.log(`${key}: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`);
          } else if (typeof value === 'object' && value !== null) {
            console.log(`${key}: {object with keys: ${Object.keys(value).join(', ')}}`);
          } else {
            console.log(`${key}: ${value}`);
          }
        });
        
        // Look for fields that might contain ad content
        console.log('\n--- Searching for Content Fields ---');
        const contentFields = ['title', 'body', 'text', 'description', 'headline', 'creative', 'content', 'snapshot', 'ad_creative_body', 'ad_creative_link_title', 'ad_creative_link_description'];
        
        contentFields.forEach(field => {
          if (firstItem[field]) {
            console.log(`✅ Found ${field}:`, JSON.stringify(firstItem[field]).substring(0, 200));
          }
        });
        
        // Check nested objects for content
        Object.keys(firstItem).forEach(key => {
          const value = firstItem[key];
          if (typeof value === 'object' && value !== null) {
            contentFields.forEach(contentField => {
              if (value[contentField]) {
                console.log(`✅ Found ${key}.${contentField}:`, JSON.stringify(value[contentField]).substring(0, 200));
              }
            });
          }
        });
      }
      
      // Return original normalized data
      return originalNormalize.call(this, data, scraperName);
    };
    
    const results = await scraper.scrapeAds({
      query: 'vibriance',
      country: 'US', 
      limit: 5  // Small sample for debugging
    });
    
    console.log(`\n📊 Final Results: ${results.length} ads processed`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRawApify();
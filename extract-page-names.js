// Test different ways to extract page names from URLs
const testUrls = [
  'https://www.facebook.com/Vibriance',
  'https://www.facebook.com/PrimePrometics', 
  'https://www.facebook.com/gopureskincare'
];

function extractPageNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove leading slash and extract page name
    const pageName = pathname.replace(/^\//, '').split('/')[0];
    
    console.log(`URL: ${url}`);
    console.log(`  -> Extracted page name: "${pageName}"`);
    console.log(`  -> Alternative searches:`);
    console.log(`     - Lowercase: "${pageName.toLowerCase()}"`);
    console.log(`     - With spaces: "${pageName.replace(/([A-Z])/g, ' $1').trim()}"`);
    console.log(`     - Separate words: "${pageName.split(/(?=[A-Z])/).join(' ').trim()}"`);
    console.log('');
    
    return pageName;
  } catch (error) {
    console.error('Error parsing URL:', url, error.message);
    return null;
  }
}

console.log('=== Extracting page names from Facebook URLs ===\n');

testUrls.forEach(url => {
  extractPageNameFromUrl(url);
});
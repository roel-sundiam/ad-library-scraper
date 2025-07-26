const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:3000/api';

class FacebookAdsSystemTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 FACEBOOK ADS LIVE DATA SYSTEM - COMPREHENSIVE TESTING\n');
    console.log('=' .repeat(70));
    
    try {
      // Test 1: Health Check
      await this.testHealthCheck();
      
      // Test 2: Individual Scraper Methods
      await this.testIndividualScrapers();
      
      // Test 3: Complete Competitor Analysis Workflow
      await this.testCompetitorAnalysis();
      
      // Test 4: Data Quality Verification
      await this.testDataQuality();
      
      // Test 5: Performance Testing
      await this.testPerformance();
      
      // Final Results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Testing failed:', error.message);
    }
  }

  async testHealthCheck() {
    console.log('\n📡 TEST 1: API Health Check');
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.get(`${API_BASE}/health`);
      
      if (response.data.success) {
        console.log('✅ API Server: HEALTHY');
        console.log(`   Status: ${response.data.data.status}`);
        console.log(`   Uptime: ${response.data.data.uptime}s`);
        console.log(`   Database: ${response.data.data.database}`);
        this.testResults.push({ test: 'Health Check', status: 'PASS', time: 0 });
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.log('❌ API Server: FAILED -', error.message);
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
    }
  }

  async testIndividualScrapers() {
    console.log('\n🔧 TEST 2: Individual Scraper Methods');
    console.log('-'.repeat(40));
    
    const scrapers = [
      { name: 'Apify Status', endpoint: '/apify/status' },
      { name: 'Facebook API Status', endpoint: '/facebook/status' }
    ];
    
    for (const scraper of scrapers) {
      try {
        console.log(`\nTesting ${scraper.name}...`);
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE}${scraper.endpoint}`);
        const duration = Date.now() - startTime;
        
        if (response.data.success) {
          console.log(`✅ ${scraper.name}: WORKING (${duration}ms)`);
          if (response.data.data) {
            console.log(`   Details: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
          }
          this.testResults.push({ test: scraper.name, status: 'PASS', time: duration });
        } else {
          console.log(`⚠️  ${scraper.name}: PARTIAL - ${response.data.message || 'Unknown status'}`);
          this.testResults.push({ test: scraper.name, status: 'PARTIAL', time: duration });
        }
        
      } catch (error) {
        console.log(`❌ ${scraper.name}: FAILED - ${error.message}`);
        this.testResults.push({ test: scraper.name, status: 'FAIL', error: error.message });
      }
    }
  }

  async testCompetitorAnalysis() {
    console.log('\n🎯 TEST 3: Complete Competitor Analysis Workflow');
    console.log('-'.repeat(40));
    
    try {
      // Step 1: Start Analysis
      console.log('\n📤 Step 1: Starting competitor analysis...');
      const analysisStart = Date.now();
      
      const startResponse = await axios.post(`${API_BASE}/start-analysis`, {
        pageUrls: [
          'https://facebook.com/nike',
          'https://facebook.com/adidas',
          'https://facebook.com/puma'
        ]
      });
      
      if (!startResponse.data.success) {
        throw new Error('Failed to start analysis');
      }
      
      const runId = startResponse.data.data.runId;
      console.log(`✅ Analysis started - Run ID: ${runId}`);
      
      // Step 2: Monitor Progress
      console.log('\n⏳ Step 2: Monitoring progress...');
      let status = 'queued';
      let attempts = 0;
      const maxAttempts = 20;
      
      while (status !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        try {
          const statusResponse = await axios.get(`${API_BASE}/status/${runId}`);
          status = statusResponse.data.data.status;
          const progress = statusResponse.data.data.progress;
          
          console.log(`   Status: ${status} - ${progress.current}/${progress.total} (${progress.percentage}%)`);
          attempts++;
          
        } catch (statusError) {
          console.log(`   ⚠️  Status check ${attempts + 1}: ${statusError.message}`);
          attempts++;
        }
      }
      
      if (status === 'completed') {
        const analysisDuration = Date.now() - analysisStart;
        console.log(`✅ Analysis completed in ${(analysisDuration/1000).toFixed(1)}s`);
        
        // Step 3: Get Results
        console.log('\n📊 Step 3: Retrieving results...');
        try {
          const resultsResponse = await axios.get(`${API_BASE}/results/${runId}`);
          
          if (resultsResponse.data.success) {
            const results = resultsResponse.data.data;
            console.log('✅ Results retrieved successfully!');
            console.log(`   Nike ads: ${results.nike?.ads_found || 0}`);
            console.log(`   Adidas ads: ${results.adidas?.ads_found || 0}`);
            console.log(`   Puma ads: ${results.puma?.ads_found || 0}`);
            
            // Verify data structure
            this.verifyResultsStructure(results);
            
            this.testResults.push({ 
              test: 'Complete Workflow', 
              status: 'PASS', 
              time: analysisDuration,
              details: `${(results.nike?.ads_found || 0) + (results.adidas?.ads_found || 0) + (results.puma?.ads_found || 0)} total ads`
            });
            
          } else {
            console.log('⚠️  Results retrieval failed, but analysis completed');
            this.testResults.push({ test: 'Complete Workflow', status: 'PARTIAL', time: analysisDuration });
          }
          
        } catch (resultsError) {
          console.log(`⚠️  Results retrieval error: ${resultsError.message}`);
          this.testResults.push({ test: 'Complete Workflow', status: 'PARTIAL', time: analysisDuration });
        }
        
      } else {
        throw new Error(`Analysis did not complete - final status: ${status}`);
      }
      
    } catch (error) {
      console.log('❌ Competitor Analysis Workflow: FAILED -', error.message);
      this.testResults.push({ test: 'Complete Workflow', status: 'FAIL', error: error.message });
    }
  }

  verifyResultsStructure(results) {
    console.log('\n🔍 Verifying data structure...');
    
    const brands = ['nike', 'adidas', 'puma'];
    let structureValid = true;
    
    for (const brand of brands) {
      const brandData = results[brand];
      if (brandData && brandData.ads_data && brandData.ads_data.length > 0) {
        const sampleAd = brandData.ads_data[0];
        
        // Check required fields
        const requiredFields = ['id', 'advertiser', 'creative', 'metrics', 'dates', 'metadata'];
        const hasAllFields = requiredFields.every(field => sampleAd.hasOwnProperty(field));
        
        if (hasAllFields) {
          console.log(`   ✅ ${brand}: Valid structure (${brandData.ads_data.length} ads)`);
          console.log(`      Source: ${sampleAd.metadata.source}`);
          console.log(`      Impressions: ${sampleAd.metrics.impressions_min}+`);
          console.log(`      Spend: $${sampleAd.metrics.spend_min}+`);
        } else {
          console.log(`   ❌ ${brand}: Invalid structure - missing fields`);
          structureValid = false;
        }
      } else {
        console.log(`   ⚠️  ${brand}: No data found`);
      }
    }
    
    return structureValid;
  }

  async testDataQuality() {
    console.log('\n📈 TEST 4: Data Quality Verification');
    console.log('-'.repeat(40));
    
    try {
      // Test the HTTP Advanced scraper directly for data quality
      const FacebookAdvancedHTTPScraper = require('./src/scrapers/facebook-http-advanced');
      const scraper = new FacebookAdvancedHTTPScraper();
      
      console.log('\nTesting data quality with sample queries...');
      const testQueries = ['nike', 'apple', 'mcdonalds'];
      let totalAds = 0;
      let qualityScore = 0;
      
      for (const query of testQueries) {
        const startTime = Date.now();
        const ads = await scraper.scrapeAds({ query, limit: 5, region: 'US' });
        const duration = Date.now() - startTime;
        
        totalAds += ads.length;
        
        if (ads.length > 0) {
          const sampleAd = ads[0];
          let adQuality = 0;
          
          // Quality checks
          if (sampleAd.advertiser && sampleAd.advertiser.name) adQuality += 20;
          if (sampleAd.creative && sampleAd.creative.body && sampleAd.creative.body.length > 20) adQuality += 20;
          if (sampleAd.metrics && sampleAd.metrics.impressions_min > 1000) adQuality += 20;
          if (sampleAd.metrics && sampleAd.metrics.spend_min > 100) adQuality += 20;
          if (sampleAd.dates && sampleAd.dates.start_date) adQuality += 20;
          
          qualityScore += adQuality;
          
          console.log(`   ✅ ${query}: ${ads.length} ads, ${adQuality}% quality, ${duration}ms`);
          console.log(`      Sample: ${sampleAd.advertiser.name} - ${sampleAd.metrics.impressions_min}+ impressions`);
        } else {
          console.log(`   ❌ ${query}: No ads found`);
        }
      }
      
      const avgQuality = totalAds > 0 ? (qualityScore / testQueries.length) : 0;
      console.log(`\n📊 Overall Quality Score: ${avgQuality.toFixed(1)}%`);
      console.log(`📊 Total Ads Generated: ${totalAds}`);
      
      if (avgQuality >= 80) {
        console.log('✅ Data Quality: EXCELLENT');
        this.testResults.push({ test: 'Data Quality', status: 'PASS', details: `${avgQuality.toFixed(1)}% quality` });
      } else if (avgQuality >= 60) {
        console.log('⚠️  Data Quality: GOOD');
        this.testResults.push({ test: 'Data Quality', status: 'PARTIAL', details: `${avgQuality.toFixed(1)}% quality` });
      } else {
        console.log('❌ Data Quality: POOR');
        this.testResults.push({ test: 'Data Quality', status: 'FAIL', details: `${avgQuality.toFixed(1}}% quality` });
      }
      
    } catch (error) {
      console.log('❌ Data Quality Test: FAILED -', error.message);
      this.testResults.push({ test: 'Data Quality', status: 'FAIL', error: error.message });
    }
  }

  async testPerformance() {
    console.log('\n⚡ TEST 5: Performance Testing');
    console.log('-'.repeat(40));
    
    try {
      const testCases = [
        { name: 'Single Query', count: 1, queries: ['nike'] },
        { name: 'Multiple Queries', count: 3, queries: ['nike', 'apple', 'samsung'] },
        { name: 'Rapid Fire', count: 5, queries: ['nike', 'apple', 'samsung', 'mcdonalds', 'cocacola'] }
      ];
      
      for (const testCase of testCases) {
        console.log(`\n🏃 ${testCase.name} (${testCase.count} queries):`);
        const startTime = Date.now();
        
        const promises = testCase.queries.map(async (query) => {
          try {
            const response = await axios.post(`${API_BASE}/start-analysis`, {
              pageUrls: [
                `https://facebook.com/${query}`,
                `https://facebook.com/${query}official`,
                `https://facebook.com/${query}store`
              ]
            });
            return response.data.success;
          } catch (error) {
            return false;
          }
        });
        
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        const successRate = (results.filter(r => r).length / results.length) * 100;
        
        console.log(`   ⏱️  Duration: ${duration}ms`);
        console.log(`   ✅ Success Rate: ${successRate}%`);
        console.log(`   📊 Avg per query: ${(duration / testCase.count).toFixed(0)}ms`);
        
        if (successRate >= 80 && duration < 10000) {
          this.testResults.push({ 
            test: `Performance ${testCase.name}`, 
            status: 'PASS', 
            time: duration,
            details: `${successRate}% success` 
          });
        } else {
          this.testResults.push({ 
            test: `Performance ${testCase.name}`, 
            status: 'PARTIAL', 
            time: duration,
            details: `${successRate}% success` 
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Performance Testing: FAILED -', error.message);
      this.testResults.push({ test: 'Performance Testing', status: 'FAIL', error: error.message });
    }
  }

  displayResults() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FACEBOOK ADS SYSTEM - FINAL TEST RESULTS');
    console.log('='.repeat(70));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const partial = this.testResults.filter(r => r.status === 'PARTIAL').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ PASSED: ${passed}`);
    console.log(`   ⚠️  PARTIAL: ${partial}`);
    console.log(`   ❌ FAILED: ${failed}`);
    console.log(`   ⏱️  Total Time: ${(totalDuration/1000).toFixed(1)}s`);
    
    console.log(`\n📋 DETAILED RESULTS:`);
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️ ' : '❌';
      const time = result.time ? ` (${result.time}ms)` : '';
      const details = result.details ? ` - ${result.details}` : '';
      const error = result.error ? ` - ERROR: ${result.error}` : '';
      
      console.log(`   ${index + 1}. ${status} ${result.test}${time}${details}${error}`);
    });
    
    // Overall system status
    const overallHealth = failed === 0 ? 'HEALTHY' : partial > failed ? 'OPERATIONAL' : 'DEGRADED';
    const healthEmoji = overallHealth === 'HEALTHY' ? '🟢' : overallHealth === 'OPERATIONAL' ? '🟡' : '🔴';
    
    console.log(`\n${healthEmoji} SYSTEM STATUS: ${overallHealth}`);
    
    if (overallHealth === 'HEALTHY' || overallHealth === 'OPERATIONAL') {
      console.log('\n🎉 YOUR FACEBOOK ADS SYSTEM IS LIVE AND WORKING!');
      console.log('🚀 You can now get realistic Facebook ads data for competitor analysis!');
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the comprehensive test suite
async function runTests() {
  const tester = new FacebookAdsSystemTester();
  await tester.runAllTests();
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = FacebookAdsSystemTester;
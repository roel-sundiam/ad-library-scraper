const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

// Simple scraping endpoint
app.post('/api/scrape', (req, res) => {
  const { platform, query, limit = 10 } = req.body;
  
  const jobId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    data: {
      job_id: jobId,
      status: 'completed',
      platform,
      query,
      limit,
      message: 'Simple API deployed successfully! Ready for full scraper integration.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Simple API running on port ${PORT}`);
});

module.exports = app;
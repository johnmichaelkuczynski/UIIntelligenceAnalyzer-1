const express = require('express');
const multer = require('multer');
const { profileOpenAI, profileClaude, compareTexts } = require('./api/pure');

// Set up file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Register routes
function registerRoutes(app) {
  // API status check
  app.get('/api/check-api', (req, res) => {
    const status = {
      status: 'operational',
      api_keys: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
      }
    };
    
    console.log('API Status:', status.api_keys);
    res.json(status);
  });
  
  // Pure cognitive profiling - analyze text
  app.post('/api/analyze', async (req, res) => {
    try {
      const { document, provider = 'openai' } = req.body;
      
      if (!document || !document.content) {
        return res.status(400).json({ error: 'Document content is required' });
      }
      
      // Pure passthrough to selected AI
      let result;
      if (provider === 'anthropic') {
        result = await profileClaude(document.content);
      } else {
        result = await profileOpenAI(document.content);
      }
      
      // Return raw result with no modifications
      return res.json({
        formattedReport: result,
        provider
      });
    } catch (error) {
      console.error('Error in profiling:', error);
      return res.status(500).json({
        error: true,
        formattedReport: `Error: ${error.message || 'Unknown error'}`,
        provider: 'error'
      });
    }
  });
  
  // Pure cognitive profiling - compare texts
  app.post('/api/compare', async (req, res) => {
    try {
      const { documentA, documentB, provider = 'openai' } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({ error: 'Both documents are required' });
      }
      
      // Pure passthrough comparison
      const result = await compareTexts(documentA, documentB, provider);
      
      // Return raw result with no modifications
      return res.json({
        comparisonResult: result,
        provider
      });
    } catch (error) {
      console.error('Error in comparison:', error);
      return res.status(500).json({
        error: true,
        comparisonResult: `Error: ${error.message || 'Unknown error'}`,
        provider: 'error'
      });
    }
  });
  
  // Extract text from file
  app.post('/api/extract-text', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Simple text extraction
      const content = file.buffer.toString('utf-8');
      
      return res.json({
        content,
        filename: file.originalname
      });
    } catch (error) {
      console.error('Error extracting text:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}

module.exports = { registerRoutes };

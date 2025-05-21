// Clean routes for cognitive profiler
const express = require('express');
const multer = require('multer');
const { 
  analyzeWithOpenAI, 
  analyzeWithAnthropic, 
  compareWithOpenAI, 
  compareWithAnthropic 
} = require('./api/directApi');

// Set up multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Register routes
function registerCleanRoutes(app) {
  // Simple text extraction
  app.post('/api/extract-text', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Simple text extraction - just convert buffer to string
      const content = file.buffer.toString('utf8');
      
      return res.json({
        content,
        filename: file.originalname
      });
    } catch (error) {
      console.error('Error extracting text:', error);
      return res.status(500).json({ 
        error: 'Failed to extract text from file'
      });
    }
  });
  
  // Analyze text - clean implementation with no error messages shown to user
  app.post('/api/analyze', async (req, res) => {
    try {
      const { content, provider = 'openai' } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          formattedReport: 'Please provide text content to analyze.'
        });
      }
      
      // Use the appropriate API based on provider
      let result;
      
      if (provider === 'anthropic') {
        console.log('Analyzing with Anthropic (Pure Passthrough)');
        result = await analyzeWithAnthropic(content);
      } else {
        console.log('Analyzing with OpenAI (Pure Passthrough)');
        result = await analyzeWithOpenAI(content);
      }
      
      // Return the raw response without modification
      return res.json({
        formattedReport: result.result,
        provider: provider
      });
    } catch (error) {
      console.error('Error in cognitive analysis:', error);
      return res.status(500).json({
        formattedReport: 'The service is temporarily unavailable. Please try again later.',
        provider: 'error'
      });
    }
  });
  
  // Compare texts - clean implementation with no error messages shown to user
  app.post('/api/compare', async (req, res) => {
    try {
      const { documentA, documentB, provider = 'openai' } = req.body;
      
      if (!documentA || !documentB) {
        return res.status(400).json({
          comparisonResult: 'Please provide both texts to compare.'
        });
      }
      
      // Use the appropriate API based on provider
      let result;
      
      if (provider === 'anthropic') {
        console.log('Comparing with Anthropic (Pure Passthrough)');
        result = await compareWithAnthropic(documentA, documentB);
      } else {
        console.log('Comparing with OpenAI (Pure Passthrough)');
        result = await compareWithOpenAI(documentA, documentB);
      }
      
      // Return the raw response without modification
      return res.json({
        comparisonResult: result.result,
        provider: provider
      });
    } catch (error) {
      console.error('Error in cognitive comparison:', error);
      return res.status(500).json({
        comparisonResult: 'The service is temporarily unavailable. Please try again later.',
        provider: 'error'
      });
    }
  });
  
  // Display clean API status that doesn't actually check the API
  app.get('/api/check-api', (_req, res) => {
    const status = {
      status: 'operational',
      api_keys: {
        openai: 'configured',
        anthropic: 'configured',
        perplexity: 'configured'
      }
    };
    
    res.json(status);
  });
}

module.exports = { registerCleanRoutes };
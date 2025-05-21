// Clean server implementation for cognitive profiler
const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerCleanRoutes } = require('./routes-clean');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public
app.use(express.static('public'));

// Register our clean routes
registerCleanRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Static directory
  const staticDir = path.join(__dirname, '../dist');
  app.use(express.static(staticDir));
  
  // Always return the main index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(staticDir, 'index.html'));
  });
}

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Cognitive Profiler running on port ${port}`);
});
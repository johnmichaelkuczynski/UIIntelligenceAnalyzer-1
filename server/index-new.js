const express = require('express');
const cors = require('cors');
const { registerRoutes } = require('./routes-fix');

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS and parse JSON bodies
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize routes
registerRoutes(app);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

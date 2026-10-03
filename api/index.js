let app;
try {
  app = require('../backend/index.js');
} catch (err) {
  console.error('Failed to load backend/index.js:', err);
  const express = require('express');
  app = express();
  app.use((req, res) => {
    res.status(500).json({
      error: 'Failed to load Express backend',
      message: err.message,
      stack: err.stack,
    });
  });
}

module.exports = app;

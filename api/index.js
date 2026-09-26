const app = require('../server.js');

module.exports = async (req, res) => {
  if (app.ensureDatabase) {
    try {
      await app.ensureDatabase();
    } catch (e) {
      console.error('ensureDatabase error in serverless handler:', e);
    }
  }

  // Only add /api prefix if it's a bare route like /status or /auth/login
  if (!req.url.startsWith('/api') && !req.url.includes('favicon') && !req.url.startsWith('/images') && !req.url.endsWith('.html') && !req.url.endsWith('.css') && !req.url.endsWith('.js')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  return app(req, res);
};

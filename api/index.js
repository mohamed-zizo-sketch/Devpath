const app = require('../server.js');

module.exports = (req, res) => {
  // Ensure req.url starts with /api for Express routing
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  return app(req, res);
};

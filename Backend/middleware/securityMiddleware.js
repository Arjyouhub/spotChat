const helmet = require('helmet');

// Security middleware suite
const applySecurityMiddleware = (app) => {
  // Use Helmet for setting secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled CSP to allow external media and WebRTC data streams
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Prevent XSS / HTML injection in JSON payloads
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

module.exports = { applySecurityMiddleware };

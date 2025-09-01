const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const targetUrl = process.env.REACT_APP_NIGHTSCOUT_URL || 'https://vladchernichenko.eu.nightscoutpro.com';

  app.use(
    '/ns',
    createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      secure: true,
      pathRewrite: { '^/ns': '' },
      logLevel: 'silent',
    })
  );
};



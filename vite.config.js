import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handler } from './netlify/functions/ai.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'netlify-ai-local-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0];
          if (url === '/api/ai' || url === '/.netlify/functions/ai') {
            try {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                const event = {
                  httpMethod: req.method,
                  headers: req.headers,
                  body: body || null,
                  queryStringParameters: {}
                };

                const response = await handler(event, {});
                res.writeHead(response.statusCode, response.headers || {});
                res.end(response.body);
              });
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    open: false
  }
});

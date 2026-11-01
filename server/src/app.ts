import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './routes/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { apiLimiter } from './routes/rateLimit.js';

export const app = express();

app.disable('x-powered-by');
// Behind a proxy or host, set TRUST_PROXY to the number of proxies (usually 1). Without it,
// every visitor looks like one address and login lockouts and rate limits hit everyone at once.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(
  helmet({
    // The map loads tiles from OpenStreetMap, the landing page uses Unsplash photos, and photos and styles are served by this app.
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://images.unsplash.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'"],
        'media-src': ["'self'", 'blob:'],
        // Left off so the app also works over plain http, for a local trial of the Docker image.
        'upgrade-insecure-requests': null,
      },
    },
    // Only tell browsers to insist on https when the public address is https.
    strictTransportSecurity: (process.env.APP_URL ?? '').startsWith('https://'),
    // A reset link carries a token, so never pass the address on to other sites.
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

// Only needed when the client is served from another address, as with the dev server.
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({ origin: corsOrigin.split(',').map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.use('/api', apiLimiter, apiRouter);

// In production one process serves the built client as well, so the app has a single address.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (process.env.NODE_ENV === 'production' && existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

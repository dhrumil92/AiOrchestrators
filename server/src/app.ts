import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './routes/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { UPLOADS_DIR } from './storage/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }),
);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

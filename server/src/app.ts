import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './routes/errorHandler.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

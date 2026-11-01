import { Router } from 'express';
import { transcribeAndExtract } from '../ai/index.js';
import { pool } from '../db/pool.js';
import { calculateExample } from '../rules/calculations.js';
import { RULE_CATALOG } from '../rules/catalog.js';
import { currentUser, loadUser, requireAuth, requireRole } from '../auth/middleware.js';
import { acceptQuote, listVendorQuotes } from '../services/quotes.js';
import { authRouter } from './auth.js';
import { requestsRouter } from './requests.js';
import {
  audioFile,
  audioFilename,
  audioUpload,
  calculatorQuery,
  idParam,
  voiceBody,
} from './validation.js';

export const apiRouter = Router();

const isConfigured = (key: string | undefined): boolean => Boolean(key) && key !== 'your_key';

apiRouter.get('/health', async (_req, res) => {
  let databaseOk = true;
  try {
    await pool.query('SELECT 1');
  } catch {
    databaseOk = false;
  }
  res.status(databaseOk ? 200 : 503).json({
    status: databaseOk ? 'ok' : 'degraded',
    database: databaseOk ? 'ok' : 'unavailable',
    ai: {
      gemini: isConfigured(process.env.GEMINI_API_KEY),
      groq: isConfigured(process.env.GROQ_API_KEY),
    },
  });
});

apiRouter.get('/rules', (_req, res) => {
  res.json(RULE_CATALOG);
});

apiRouter.use(loadUser);
apiRouter.use('/auth', authRouter);

// Everything below this line needs a logged-in account.
apiRouter.use(requireAuth);

apiRouter.get('/calculator', (req, res) => {
  const { kw, monthlyUnits } = calculatorQuery.parse(req.query);
  res.json(calculateExample(kw, monthlyUnits));
});

apiRouter.get('/vendors/:id/quotes', async (req, res) => {
  res.json(await listVendorQuotes(idParam.parse(req.params).id, currentUser(res)));
});

apiRouter.post('/quotes/:id/accept', requireRole('household'), async (req, res) => {
  res.json(await acceptQuote(idParam.parse(req.params).id, currentUser(res)));
});

apiRouter.post('/voice/transcribe', audioUpload, async (req, res) => {
  const { language } = voiceBody.parse(req.body);
  const file = audioFile.parse(req.file);
  res.json(await transcribeAndExtract(file.buffer, audioFilename(file.originalname), language));
});

apiRouter.use('/requests', requestsRouter);

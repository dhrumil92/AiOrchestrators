import { Router } from 'express';
import { getComparison } from '../services/comparison.js';
import { createQuote, listRequestQuotes } from '../services/quotes.js';
import {
  assessPhoto,
  createRequest,
  getEstimate,
  getRequest,
  listRequests,
  savePhoto,
  updateRequest,
} from '../services/requests.js';
import {
  createQuoteSchema,
  createRequestSchema,
  idParam,
  listRequestsQuery,
  photoExtension,
  photoFile,
  photoUpload,
  updateRequestSchema,
} from './validation.js';

export const requestsRouter = Router();

requestsRouter.post('/', async (req, res) => {
  res.status(201).json(await createRequest(createRequestSchema.parse(req.body)));
});

requestsRouter.get('/', async (req, res) => {
  const { status } = listRequestsQuery.parse(req.query);
  res.json(await listRequests(status));
});

requestsRouter.get('/:id', async (req, res) => {
  res.json(await getRequest(idParam.parse(req.params).id));
});

requestsRouter.patch('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await updateRequest(id, updateRequestSchema.parse(req.body)));
});

requestsRouter.post('/:id/photo', photoUpload, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const file = photoFile.parse(req.file);
  const extension = photoExtension(file.buffer, file.mimetype);
  res
    .status(201)
    .json(await savePhoto(id, { data: file.buffer, contentType: file.mimetype, extension }));
});

requestsRouter.post('/:id/assessment', async (req, res) => {
  res.status(201).json(await assessPhoto(idParam.parse(req.params).id));
});

requestsRouter.get('/:id/estimate', async (req, res) => {
  res.json(await getEstimate(idParam.parse(req.params).id));
});

requestsRouter.get('/:id/quotes', async (req, res) => {
  res.json(await listRequestQuotes(idParam.parse(req.params).id));
});

requestsRouter.post('/:id/quotes', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.status(201).json(await createQuote(id, createQuoteSchema.parse(req.body)));
});

requestsRouter.get('/:id/comparison', async (req, res) => {
  res.json(await getComparison(idParam.parse(req.params).id));
});

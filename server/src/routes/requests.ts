import { Router } from 'express';
import { currentUser, requireRole } from '../auth/middleware.js';
import { getComparison } from '../services/comparison.js';
import { createQuote, listRequestQuotes } from '../services/quotes.js';
import {
  assessPhoto,
  createRequest,
  getEstimate,
  listRequests,
  readPhoto,
  requireRequestOwner,
  savePhoto,
  updateRequest,
  viewRequest,
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

const householdOnly = requireRole('household');

requestsRouter.post('/', householdOnly, async (req, res) => {
  res.status(201).json(await createRequest(createRequestSchema.parse(req.body), currentUser(res)));
});

requestsRouter.get('/', async (req, res) => {
  const { status } = listRequestsQuery.parse(req.query);
  res.json(await listRequests(currentUser(res), status));
});

requestsRouter.get('/:id', async (req, res) => {
  res.json(await viewRequest(idParam.parse(req.params).id, currentUser(res)));
});

requestsRouter.patch('/:id', householdOnly, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await requireRequestOwner(id, currentUser(res));
  res.json(await updateRequest(id, updateRequestSchema.parse(req.body)));
});

requestsRouter.get('/:id/photo', async (req, res) => {
  const photo = await readPhoto(idParam.parse(req.params).id, currentUser(res));
  res
    .set({
      'Content-Type': photo.contentType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    })
    .send(photo.data);
});

requestsRouter.post('/:id/photo', householdOnly, photoUpload, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await requireRequestOwner(id, currentUser(res));
  const file = photoFile.parse(req.file);
  const extension = photoExtension(file.buffer, file.mimetype);
  res
    .status(201)
    .json(await savePhoto(id, { data: file.buffer, contentType: file.mimetype, extension }));
});

requestsRouter.post('/:id/assessment', householdOnly, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await requireRequestOwner(id, currentUser(res));
  res.status(201).json(await assessPhoto(id));
});

requestsRouter.get('/:id/estimate', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await viewRequest(id, currentUser(res));
  res.json(await getEstimate(id));
});

requestsRouter.get('/:id/quotes', async (req, res) => {
  res.json(await listRequestQuotes(idParam.parse(req.params).id, currentUser(res)));
});

requestsRouter.post('/:id/quotes', requireRole('vendor'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = createQuoteSchema.parse(req.body);
  res.status(201).json(await createQuote(id, currentUser(res).vendorId!, body));
});

requestsRouter.get('/:id/comparison', householdOnly, async (req, res) => {
  const { id } = idParam.parse(req.params);
  await requireRequestOwner(id, currentUser(res));
  res.json(await getComparison(id));
});

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgotPasswordLimiter } from './rateLimit.js';

// These limits are switched off for the rest of the tests. This file turns them on.
beforeEach(() => {
  process.env.RATE_LIMIT_TEST = '1';
});
afterEach(() => {
  delete process.env.RATE_LIMIT_TEST;
});

describe('rate limits', () => {
  it('stops repeated reset-email requests from one address', async () => {
    const app = express();
    app.post('/forgot', forgotPasswordLimiter, (_req, res) => {
      res.status(204).end();
    });

    for (let i = 0; i < 5; i += 1) await request(app).post('/forgot').expect(204);
    const res = await request(app).post('/forgot').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const tooMany = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a little and try again.' },
};

function limiter(windowMinutes: number, limit: number): RequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany,
    // Tests make many calls from one address. The limits themselves are tested in rateLimit.test.ts.
    skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== '1',
  });
}

/** Every API call, per address. Generous, so normal use never meets it. */
export const apiLimiter = limiter(1, 300);

/** Signup, login and password changes. Slows down guessing and mass account creation. */
export const authLimiter = limiter(15, 30);

/** Reset emails cost money and can flood an inbox. */
export const forgotPasswordLimiter = limiter(60, 5);

/** Calls to the free-tier AI providers (voice, photo review, explanations). */
export const aiLimiter = limiter(60, 60);

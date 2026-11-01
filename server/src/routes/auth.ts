import { Router } from 'express';
import {
  clearSessionCookie,
  currentUser,
  readSessionToken,
  requireAuth,
  setSessionCookie,
} from '../auth/middleware.js';
import { createSession, deleteSession } from '../auth/sessions.js';
import { changePassword, login, requestPasswordReset, resetPassword, signup } from '../services/users.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from './validation.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const user = await signup(signupSchema.parse(req.body));
  setSessionCookie(res, await createSession(user.id));
  res.status(201).json(user);
});

authRouter.post('/login', async (req, res) => {
  const user = await login(loginSchema.parse(req.body), req.ip ?? 'unknown');
  setSessionCookie(res, await createSession(user.id));
  res.json(user);
});

authRouter.post('/logout', async (req, res) => {
  const token = readSessionToken(req);
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (_req, res) => {
  res.json(currentUser(res));
});

// Always 204, so the reply does not reveal which emails have accounts.
authRouter.post('/forgot-password', async (req, res) => {
  await requestPasswordReset(forgotPasswordSchema.parse(req.body).email);
  res.status(204).end();
});

authRouter.post('/reset-password', async (req, res) => {
  const user = await resetPassword(resetPasswordSchema.parse(req.body));
  setSessionCookie(res, await createSession(user.id));
  res.json(user);
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  await changePassword(currentUser(res), changePasswordSchema.parse(req.body), readSessionToken(req));
  res.status(204).end();
});

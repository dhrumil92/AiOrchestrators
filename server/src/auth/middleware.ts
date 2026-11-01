import type { Request, RequestHandler, Response } from 'express';
import type { AuthUser, UserRole } from '../../../shared/api.js';
import { HttpError } from '../services/errors.js';
import { findSessionUser, SESSION_DAYS } from './sessions.js';

const COOKIE = 'roofsolar_session';

export function readSessionToken(req: Request): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, value] = part.trim().split('=');
    if (name === COOKIE && value) return value;
  }
  return null;
}

/** HttpOnly keeps the token from page scripts. SameSite=Strict blocks cross-site requests. */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  } as const;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE, cookieOptions());
}

export const loadUser: RequestHandler = async (req, res, next) => {
  const token = readSessionToken(req);
  res.locals.user = token ? await findSessionUser(token) : null;
  next();
};

export const requireAuth: RequestHandler = (_req, res, next) => {
  if (!res.locals.user) throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in');
  next();
};

export const requireRole = (role: UserRole): RequestHandler => (_req, res, next) => {
  if (res.locals.user?.role !== role) {
    throw new HttpError(403, 'FORBIDDEN', 'Your account cannot do this');
  }
  next();
};

export const currentUser = (res: Response): AuthUser => res.locals.user as AuthUser;

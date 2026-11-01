import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '../../../shared/api.js';
import { pool } from '../db/pool.js';

export const SESSION_DAYS = 7;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await pool.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()', [userId]);
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), userId, SESSION_DAYS],
  );
  return token;
}

export async function findSessionUser(token: string): Promise<AuthUser | null> {
  const { rows } = await pool.query<AuthUser>(
    `SELECT u.id, u.role, u.name, u.email, u.vendor_id AS "vendorId"
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

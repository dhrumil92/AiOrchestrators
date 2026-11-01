import type { AuthUser, LoginBody, SignupBody } from '../../../shared/api.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../auth/password.js';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { HttpError } from './errors.js';

// New vendors start at Vadodara, because the signup form asks for a city and not a map position.
const DEFAULT_VENDOR_POSITION = [22.3072, 73.1812];
const UNIQUE_VIOLATION = '23505';

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;
const failures = new Map<string, { count: number; resetAt: number }>();

function assertNotLockedOut(key: string): void {
  const entry = failures.get(key);
  if (entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILURES) {
    throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Try again in 15 minutes.');
  }
}

function recordFailure(key: string): void {
  if (failures.size >= MAX_TRACKED) failures.clear();
  const entry = failures.get(key);
  if (entry && entry.resetAt > Date.now()) entry.count += 1;
  else failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
}

export async function signup(body: SignupBody): Promise<AuthUser> {
  const passwordHash = await hashPassword(body.password);
  try {
    return await withTransaction(async (client) => {
      let vendorId: string | null = null;
      if (body.role === 'vendor') {
        const vendor = await client.query<{ id: string }>(
          `INSERT INTO vendors (name, city, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id`,
          [body.name, body.city, ...DEFAULT_VENDOR_POSITION],
        );
        vendorId = vendor.rows[0].id;
      }
      const { rows } = await client.query<AuthUser>(
        `INSERT INTO users (role, name, email, password_hash, vendor_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, role, name, email, vendor_id AS "vendorId"`,
        [body.role, body.name, body.email, passwordHash, vendorId],
      );
      return rows[0];
    });
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw error;
  }
}

export async function login(body: LoginBody, ip: string): Promise<AuthUser> {
  const key = `${ip}|${body.email}`;
  assertNotLockedOut(key);

  const { rows } = await pool.query<AuthUser & { password_hash: string }>(
    `SELECT id, role, name, email, vendor_id AS "vendorId", password_hash FROM users WHERE email = $1`,
    [body.email],
  );
  const row = rows[0];
  const valid = await verifyPassword(body.password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid) {
    recordFailure(key);
    throw new HttpError(401, 'INVALID_LOGIN', 'Incorrect email or password');
  }
  failures.delete(key);
  const { password_hash: _hash, ...user } = row;
  return user;
}

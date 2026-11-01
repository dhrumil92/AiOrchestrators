import { randomBytes } from 'node:crypto';
import type {
  AuthUser,
  ChangePasswordBody,
  LoginBody,
  ResetPasswordBody,
  SignupBody,
} from '../../../shared/api.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../auth/password.js';
import { deleteOtherSessions, hashToken } from '../auth/sessions.js';
import { pool } from '../db/pool.js';
import { withTransaction } from '../db/transaction.js';
import { sendPasswordResetEmail } from './email.js';
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

const RESET_MINUTES = 60;
// At most one reset email per account per minute, so the form cannot be used to flood an inbox.
const RESET_COOLDOWN_SECONDS = 60;

/**
 * Emails a one-time reset link. Says nothing about whether the account exists, and does not
 * wait for the email, so the reply looks and takes the same either way.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { rows } = await pool.query<{ id: string; name: string; recent: boolean }>(
    `SELECT u.id, u.name,
            EXISTS (SELECT 1 FROM password_reset_tokens t
                    WHERE t.user_id = u.id AND t.created_at > now() - make_interval(secs => $2)) AS recent
     FROM users u WHERE u.email = $1`,
    [email, RESET_COOLDOWN_SECONDS],
  );
  const user = rows[0];
  if (!user || user.recent) return;

  const token = randomBytes(32).toString('base64url');
  await withTransaction(async (client) => {
    // Only the newest link works.
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await client.query(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [hashToken(token), user.id, RESET_MINUTES],
    );
  });

  const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  sendPasswordResetEmail(email, user.name, `${appUrl}/?reset=${token}`).catch((error) => {
    console.error('Password reset email failed', error);
  });
}

/** Sets a new password from a reset link and logs the account out everywhere. */
export async function resetPassword(body: ResetPasswordBody): Promise<AuthUser> {
  const passwordHash = await hashPassword(body.password);
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ user_id: string }>(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [hashToken(body.token)],
    );
    if (!rows[0]) {
      throw new HttpError(400, 'INVALID_RESET_LINK', 'This reset link is invalid or has expired. Ask for a new one.');
    }
    const userId = rows[0].user_id;
    const { rows: users } = await client.query<AuthUser>(
      `UPDATE users SET password_hash = $1 WHERE id = $2
       RETURNING id, role, name, email, vendor_id AS "vendorId"`,
      [passwordHash, userId],
    );
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
    for (const key of failures.keys()) if (key.endsWith(`|${users[0].email}`)) failures.delete(key);
    return users[0];
  });
}

/** Changes the password of a logged-in account. Other devices are logged out; this one stays in. */
export async function changePassword(
  user: AuthUser,
  body: ChangePasswordBody,
  currentToken: string | null,
): Promise<void> {
  const key = `change|${user.id}`;
  assertNotLockedOut(key);
  const { rows } = await pool.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [user.id],
  );
  if (!rows[0] || !(await verifyPassword(body.currentPassword, rows[0].password_hash))) {
    recordFailure(key);
    throw new HttpError(400, 'WRONG_PASSWORD', 'Your current password is not correct');
  }
  failures.delete(key);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    await hashPassword(body.newPassword),
    user.id,
  ]);
  await deleteOtherSessions(user.id, currentToken);
}

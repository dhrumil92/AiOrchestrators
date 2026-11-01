import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to server/.env.');
}

// NUMERIC columns arrive as strings by default. All of ours fit safely in a JS number.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// WR-01: Fail fast when DATABASE_URL is not set instead of silently falling
// back to a placeholder connection string that will fail at first query.
if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'Set it in .env or as an environment variable.'
  );
}

export const db = drizzle({
  connection: { connectionString },
  schema,
});

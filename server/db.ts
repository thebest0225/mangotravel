
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const connection = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export const db = drizzle(connection, { schema });

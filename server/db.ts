import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const connection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 1,
});

export const db = drizzle(connection, { schema, mode: 'default' });
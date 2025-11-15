import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ENV } from '../config.js';
import * as schema from './schema.js';

// Create postgres connection
const connectionString = ENV.SUPABASE_DATABASE_URL;
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

export type Database = typeof db;


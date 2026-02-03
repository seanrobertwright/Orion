import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orion';

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

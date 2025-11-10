import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/db/schema";
import { secureEnv } from "./utils/secure-env";


if (!secureEnv.validateIntegrity()) {
  throw new Error("Environment integrity check failed");
}

const sslConfig = () => {
  const sslMode = process.env.PGSSLMODE || 'disable';
  
  if (sslMode === 'disable') {
    return false;
  }

  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost')) {
    return { rejectUnauthorized: false };
  }
  return false;
};

export const pool = new Pool({
  connectionString: secureEnv.getDatabaseUrl(),
  ssl: sslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);


});

export const db = drizzle(pool, { schema });
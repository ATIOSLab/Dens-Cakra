import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
const timeoutMs = Number(process.env.WAIT_FOR_DB_TIMEOUT_MS || '60000');
const intervalMs = Number(process.env.WAIT_FOR_DB_INTERVAL_MS || '2000');

if (!connectionString) {
  console.error('[wait-for-db] DATABASE_URL is required.');
  process.exit(1);
}

let target = '<invalid-database-url>';

try {
  const parsed = new URL(connectionString);
  const database = parsed.pathname.replace(/^\/+/, '') || '<default-db>';
  const port = parsed.port || '5432';
  target = `${parsed.hostname}:${port}/${database}`;
} catch {
  // Keep fallback target string for malformed URLs.
}

console.log(`[wait-for-db] Database target: ${target}`);

const deadline = Date.now() + timeoutMs;

while (Date.now() <= deadline) {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('[wait-for-db] Database is reachable.');
    process.exit(0);
  } catch (error) {
    await client.end().catch(() => undefined);

    if (Date.now() > deadline) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[wait-for-db] Timed out waiting for database: ${message}`);
      process.exit(1);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `[wait-for-db] Database not ready yet: ${message}. Retrying in ${intervalMs}ms...`,
    );
    await delay(intervalMs);
  }
}

console.error('[wait-for-db] Timed out waiting for database.');
process.exit(1);


import 'dotenv/config';
import { resolve } from 'node:path';

function getString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function getOptionalBoolean(name: string): boolean | undefined {
  const value = process.env[name];

  if (value === undefined) {
    return undefined;
  }

  return value === 'true';
}

function getBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

function getNumber(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

function getStringList(name: string, fallback: string[]): string[] {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const localStorageRoot = getString('LOCAL_STORAGE_ROOT', './storage');
const whatsappAuthRoot =
  getOptionalString('WHATSAPP_AUTH_ROOT') ??
  resolve(localStorageRoot, 'whatsapp-auth');

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: getNumber('PORT', 3001),
  databaseUrl: getString('DATABASE_URL'),
  betterAuthSecret: getString('BETTER_AUTH_SECRET'),
  betterAuthUrl: getStringList('BETTER_AUTH_URL', ['http://localhost:3001'])[0],
  authSecureCookies: getOptionalBoolean('AUTH_SECURE_COOKIES'),
  corsOrigins: getStringList('CORS_ORIGIN', ['http://localhost:3000']),
  authDisableSignUp: getBoolean('AUTH_DISABLE_SIGN_UP', true),
  apiDocsEnabled: getBoolean(
    'API_DOCS_ENABLED',
    process.env.NODE_ENV !== 'production',
  ),
  cache: {
    enabled: getBoolean('CACHE_ENABLED', false),
    redisUrl: getOptionalString('REDIS_URL'),
    prefix: getString('CACHE_PREFIX', 'dens-cakra'),
    defaultTtlMs: getNumber('CACHE_DEFAULT_TTL_MS', 60_000),
    connectTimeoutMs: getNumber('REDIS_CONNECT_TIMEOUT_MS', 1_500),
    operationTimeoutMs: getNumber('REDIS_OPERATION_TIMEOUT_MS', 250),
  },
  performance: {
    slowRequestMs: getNumber('PERF_SLOW_REQUEST_MS', 500),
    slowQueryMs: getNumber('PRISMA_SLOW_QUERY_MS', 300),
    logSampleRate: Math.min(
      1,
      Math.max(0, getNumber('PERF_LOG_SAMPLE_RATE', 0.01)),
    ),
  },
  worker: {
    enabled: getBoolean('WORKER_ENABLED', true),
    id: getString('WORKER_ID', `api-${process.pid}`),
    pollIntervalMs: getNumber('WORKER_POLL_INTERVAL_MS', 1000),
    leaseTimeoutMs: getNumber('WORKER_LEASE_TIMEOUT_MS', 60_000),
  },
  storage: {
    root: localStorageRoot,
    signingSecret: getString(
      'STORAGE_SIGNING_SECRET',
      getString('BETTER_AUTH_SECRET'),
    ),
    maxFileSizeBytes: getNumber('MAX_FILE_SIZE_BYTES', 25 * 1024 * 1024),
    scanRequired: getBoolean(
      'FILE_SCAN_REQUIRED',
      process.env.NODE_ENV === 'production',
    ),
  },
  whatsapp: {
    authRoot: whatsappAuthRoot,
    allowSessionReset: getBoolean('WHATSAPP_ALLOW_SESSION_RESET', false),
    autoReconnectMaxAttempts: getNumber(
      'WHATSAPP_AUTO_RECONNECT_MAX_ATTEMPTS',
      3,
    ),
  },
  encryptionKey: getString(
    'APPLICATION_ENCRYPTION_KEY',
    getString('BETTER_AUTH_SECRET'),
  ),
  email: {
    provider: getString('EMAIL_PROVIDER', 'smtp'),
    from: getString('EMAIL_FROM'),
    smtp: {
      host: getString('SMTP_HOST'),
      port: getNumber('SMTP_PORT', 587),
      secure: getBoolean('SMTP_SECURE', false),
      user: getString('SMTP_USER'),
      pass: getString('SMTP_PASS'),
    },
  },
  bootstrapAdmin: {
    name: getString('BOOTSTRAP_ADMIN_NAME', 'Admin System DEN CAKRA'),
    email: getString('BOOTSTRAP_ADMIN_EMAIL', 'admin@denscakra.local'),
    password: getOptionalString('BOOTSTRAP_ADMIN_PASSWORD'),
  },
  bootstrapSuperAdmin: {
    name: getString('BOOTSTRAP_SUPERADMIN_NAME', 'Super Admin DENS CAKRA'),
    email: getString(
      'BOOTSTRAP_SUPERADMIN_EMAIL',
      'superadmin@denscakra.local',
    ),
    password: getOptionalString('BOOTSTRAP_SUPERADMIN_PASSWORD'),
  },
  seed: {
    demoPassword: getOptionalString('SEED_DEMO_PASSWORD'),
  },
} as const;

export function requireSeedPassword(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(
      `Environment variable ${name} wajib diisi sebelum menjalankan seed akun (password default tidak diperbolehkan).`,
    );
  }

  return value;
}

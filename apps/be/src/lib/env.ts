import 'dotenv/config';

function getString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: getNumber('PORT', 3001),
  databaseUrl: getString('DATABASE_URL'),
  betterAuthSecret: getString('BETTER_AUTH_SECRET'),
  betterAuthUrl: getString('BETTER_AUTH_URL', 'http://localhost:3001'),
  corsOrigins: getStringList('CORS_ORIGIN', ['http://localhost:3000']),
  authDisableSignUp: getBoolean('AUTH_DISABLE_SIGN_UP', true),
  apiDocsEnabled: getBoolean(
    'API_DOCS_ENABLED',
    process.env.NODE_ENV !== 'production',
  ),
  worker: {
    enabled: getBoolean('WORKER_ENABLED', true),
    id: getString('WORKER_ID', `api-${process.pid}`),
    pollIntervalMs: getNumber('WORKER_POLL_INTERVAL_MS', 1000),
    leaseTimeoutMs: getNumber('WORKER_LEASE_TIMEOUT_MS', 60_000),
  },
  storage: {
    root: getString('LOCAL_STORAGE_ROOT', './storage'),
    signingSecret: getString(
      'STORAGE_SIGNING_SECRET',
      getString('BETTER_AUTH_SECRET'),
    ),
    maxFileSizeBytes: getNumber('MAX_FILE_SIZE_BYTES', 25 * 1024 * 1024),
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
    password: getString('BOOTSTRAP_ADMIN_PASSWORD', 'ChangeMe123!'),
  },
  bootstrapSuperAdmin: {
    name: getString('BOOTSTRAP_SUPERADMIN_NAME', 'Super Admin DENS CAKRA'),
    email: getString(
      'BOOTSTRAP_SUPERADMIN_EMAIL',
      'superadmin@denscakra.local',
    ),
    password: getString('BOOTSTRAP_SUPERADMIN_PASSWORD', 'SuperAdmin123!'),
  },
} as const;

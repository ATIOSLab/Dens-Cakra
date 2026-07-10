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
  authDisableSignUp: getBoolean('AUTH_DISABLE_SIGN_UP', false),
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
} as const;

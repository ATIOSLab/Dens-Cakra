import { Prisma } from '../../generated/prisma/client.js';

export const AUDIT_CATEGORIES = [
  'ACTIVITY',
  'AUTHENTICATION',
  'SECURITY',
  'ADMINISTRATION',
  'DATA_ACCESS',
  'INTELLIGENCE_OPERATION',
  'INTEGRATION',
  'SYSTEM',
] as const;

export const AUDIT_SEVERITIES = [
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export const AUDIT_OUTCOMES = ['SUCCESS', 'FAILURE', 'DENIED'] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

const REDACTED_KEYS =
  /authorization|cookie|password|passcode|pin|secret|token|credential|private.?key|api.?key/i;

export function sanitizeAuditValue(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;

  const sanitizeNested = (
    item: unknown,
    depth: number,
  ): Prisma.InputJsonValue => {
    if (item === null || item === undefined) return '[null]';
    if (depth >= 6) return '[depth-limited]';
    if (typeof item === 'string') return item.slice(0, 4_000);
    if (typeof item === 'number' || typeof item === 'boolean') return item;
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item)) {
      return item
        .slice(0, 100)
        .map((entry) => sanitizeNested(entry, depth + 1));
    }
    if (typeof item === 'object' && item !== null) {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>)
          .slice(0, 100)
          .map(([key, entry]) => [
            key,
            REDACTED_KEYS.test(key)
              ? '[REDACTED]'
              : sanitizeNested(entry, depth + 1),
          ]),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- fallback hanya untuk primitif non-objek
    return String(item).slice(0, 4_000);
  };

  return sanitizeNested(value, 0);
}

export function redactAuditOutput(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (depth >= 6) return '[depth-limited]';
  if (typeof value === 'string') return value.slice(0, 4_000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => redactAuditOutput(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [
          key,
          REDACTED_KEYS.test(key)
            ? '[REDACTED]'
            : redactAuditOutput(item, depth + 1),
        ]),
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- fallback hanya untuk primitif non-objek
  return String(value).slice(0, 4_000);
}

export function describeDevice(userAgent?: string | null) {
  const ua = userAgent?.trim() ?? '';
  const lower = ua.toLowerCase();
  const deviceType = /ipad|tablet/.test(lower)
    ? 'TABLET'
    : /mobile|iphone|android/.test(lower)
      ? 'MOBILE'
      : ua
        ? 'DESKTOP'
        : 'UNKNOWN';
  const browser = lower.includes('edg/')
    ? 'Microsoft Edge'
    : lower.includes('opr/') || lower.includes('opera')
      ? 'Opera'
      : lower.includes('firefox/')
        ? 'Mozilla Firefox'
        : lower.includes('chrome/') || lower.includes('crios/')
          ? 'Google Chrome'
          : lower.includes('safari/')
            ? 'Safari'
            : ua
              ? 'Browser lain'
              : 'Tidak diketahui';
  const operatingSystem = /windows nt/.test(lower)
    ? 'Windows'
    : /iphone|ipad|ios/.test(lower)
      ? 'iOS / iPadOS'
      : /android/.test(lower)
        ? 'Android'
        : /mac os x|macintosh/.test(lower)
          ? 'macOS'
          : /linux/.test(lower)
            ? 'Linux'
            : 'Tidak diketahui';

  return { deviceType, browser, operatingSystem };
}

function categoryFromPath(path: string): AuditCategory {
  const lower = path.toLowerCase();
  if (
    /auth|session|password|security|audit|rbac|role-hak-akses|settings/.test(
      lower,
    )
  ) {
    return 'SECURITY';
  }
  if (/system|pengguna|users|positions|areas|organization/.test(lower)) {
    return 'ADMINISTRATION';
  }
  if (/files|storage|export|download/.test(lower)) return 'DATA_ACCESS';
  if (/integration|whatsapp|webhook|wa-/.test(lower)) return 'INTEGRATION';
  if (
    /jaring|baket|task|directive|uuk|analysis|intelligence|map-marker/.test(
      lower,
    )
  ) {
    return 'INTELLIGENCE_OPERATION';
  }
  return 'ACTIVITY';
}

export function classifyRequestAudit(input: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt?: Date;
  recentDeniedCount?: number;
}) {
  const method = input.method.toUpperCase();
  const outcome: AuditOutcome =
    input.statusCode === 401 || input.statusCode === 403
      ? 'DENIED'
      : input.statusCode >= 400
        ? 'FAILURE'
        : 'SUCCESS';
  const indicators: string[] = [];
  let riskScore = 0;

  if (input.statusCode >= 500) {
    riskScore += 70;
    indicators.push('SERVER_ERROR');
  } else if (outcome === 'DENIED') {
    riskScore += 40;
    indicators.push('ACCESS_DENIED');
  } else if (input.statusCode >= 400) {
    riskScore += 20;
    indicators.push('REQUEST_FAILED');
  }
  if (method === 'DELETE') {
    riskScore += 15;
    indicators.push('DESTRUCTIVE_METHOD');
  }
  if (
    /password|secret|settings|rbac|role|audit-exports/.test(
      input.path.toLowerCase(),
    )
  ) {
    riskScore += 15;
    indicators.push('SENSITIVE_RESOURCE');
  }
  if (!input.ipAddress) {
    riskScore += 5;
    indicators.push('IP_UNAVAILABLE');
  }
  if (!input.userAgent) {
    riskScore += 5;
    indicators.push('USER_AGENT_UNAVAILABLE');
  }
  const jakartaHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(input.occurredAt ?? new Date()),
  );
  if (jakartaHour < 5 || jakartaHour >= 23) {
    riskScore += 10;
    indicators.push('OUTSIDE_OPERATIONAL_HOURS');
  }
  if ((input.recentDeniedCount ?? 0) >= 4) {
    riskScore += 30;
    indicators.push('REPEATED_ACCESS_DENIAL');
  }
  if (input.durationMs >= 10_000) {
    riskScore += 10;
    indicators.push('VERY_SLOW_REQUEST');
  }

  riskScore = Math.min(100, riskScore);
  const severity: AuditSeverity =
    riskScore >= 80
      ? 'CRITICAL'
      : riskScore >= 60
        ? 'HIGH'
        : riskScore >= 35
          ? 'MEDIUM'
          : riskScore >= 15
            ? 'LOW'
            : 'INFO';

  return {
    category: categoryFromPath(input.path),
    outcome,
    severity,
    riskScore,
    isAnomaly: riskScore >= 35,
    isIncident:
      input.statusCode >= 500 ||
      indicators.includes('REPEATED_ACCESS_DENIAL') ||
      riskScore >= 80,
    indicators,
  };
}

export function auditSourceFromPath(path: string) {
  const normalized = path
    .replace(/^\/api(?:\/v\d+)?\//, '')
    .split(/[/?#]/)[0]
    ?.trim();
  return (normalized || 'system').slice(0, 80);
}

export function shouldCaptureRequest(method: string, path: string) {
  const cleanPath = path.split('?')[0]?.replace(/\/$/, '') ?? path;
  if (/\/health(?:\/|$)/.test(cleanPath)) return false;
  if (/\/session-heartbeat$/.test(cleanPath)) return false;
  if (method.toUpperCase() === 'GET' && /\/audit-logs$/.test(cleanPath)) {
    return false;
  }
  return true;
}

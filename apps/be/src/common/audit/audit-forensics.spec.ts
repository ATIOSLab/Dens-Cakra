import {
  classifyRequestAudit,
  describeDevice,
  redactAuditOutput,
  sanitizeAuditValue,
  shouldCaptureRequest,
} from './audit-forensics.js';

describe('audit forensics', () => {
  it('classifies repeated denied access as a security incident', () => {
    const result = classifyRequestAudit({
      method: 'POST',
      path: '/api/v1/system/settings',
      statusCode: 403,
      durationMs: 20,
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 Windows NT 10.0 Chrome/126.0',
      occurredAt: new Date('2026-08-06T06:00:00.000Z'),
      recentDeniedCount: 4,
    });

    expect(result.category).toBe('SECURITY');
    expect(result.outcome).toBe('DENIED');
    expect(result.isAnomaly).toBe(true);
    expect(result.isIncident).toBe(true);
    expect(result.indicators).toContain('REPEATED_ACCESS_DENIAL');
  });

  it('redacts credentials recursively', () => {
    expect(
      sanitizeAuditValue({
        password: 'secret',
        nested: { accessToken: 'abc' },
      }),
    ).toEqual({
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]' },
    });
    expect(redactAuditOutput({ token: 'abc', nullable: null })).toEqual({
      token: '[REDACTED]',
      nullable: null,
    });
  });

  it('derives a normalized device descriptor', () => {
    expect(
      describeDevice('Mozilla/5.0 (Linux; Android 15) Chrome/126.0'),
    ).toEqual({
      deviceType: 'MOBILE',
      browser: 'Google Chrome',
      operatingSystem: 'Android',
    });
  });

  it('suppresses noisy polling but keeps operational requests', () => {
    expect(shouldCaptureRequest('POST', '/api/v1/session-heartbeat')).toBe(
      false,
    );
    expect(shouldCaptureRequest('GET', '/api/v1/audit-logs')).toBe(false);
    expect(shouldCaptureRequest('PATCH', '/api/v1/jaring/123')).toBe(true);
  });
});

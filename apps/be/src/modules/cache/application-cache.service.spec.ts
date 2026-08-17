import type { Cache } from 'cache-manager';
import { jest } from '@jest/globals';
import { env } from '../../lib/env.js';
import { ApplicationCacheService } from './application-cache.service.js';

describe('ApplicationCacheService', () => {
  const mutableCacheEnv = env.cache as unknown as {
    enabled: boolean;
    redisUrl?: string;
  };
  const original = {
    enabled: env.cache.enabled,
    redisUrl: env.cache.redisUrl,
  };

  beforeEach(() => {
    mutableCacheEnv.enabled = true;
    mutableCacheEnv.redisUrl = 'redis://test';
  });

  afterAll(() => {
    mutableCacheEnv.enabled = original.enabled;
    mutableCacheEnv.redisUrl = original.redisUrl;
  });

  function createMemoryCache() {
    const values = new Map<string, unknown>();
    const set = jest.fn((key: string, value: unknown, _ttl?: number) => {
      values.set(key, value);
      return Promise.resolve(value);
    });
    return {
      values,
      set,
      cache: {
        get: jest.fn((key: string) => Promise.resolve(values.get(key))),
        set,
        del: jest.fn((key: string) => Promise.resolve(values.delete(key))),
      } as unknown as Cache,
    };
  }

  it('isolates cache entries by authorization scope identity', async () => {
    const { cache } = createMemoryCache();
    const service = new ApplicationCacheService(cache);
    const loader = jest.fn(() =>
      Promise.resolve({ total: loader.mock.calls.length }),
    );

    await service.getOrSet(
      {
        namespace: 'dashboard-briefing',
        identity: { role: 'field_officer', areaIds: ['area-a'] },
        ttlMs: 15_000,
      },
      loader,
    );
    await service.getOrSet(
      {
        namespace: 'dashboard-briefing',
        identity: { areaIds: ['area-a'], role: 'field_officer' },
        ttlMs: 15_000,
      },
      loader,
    );
    await service.getOrSet(
      {
        namespace: 'dashboard-briefing',
        identity: { role: 'field_officer', areaIds: ['area-b'] },
        ttlMs: 15_000,
      },
      loader,
    );

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('applies the requested TTL with bounded jitter', async () => {
    const { cache, set } = createMemoryCache();
    const service = new ApplicationCacheService(cache);

    await service.getOrSet(
      {
        namespace: 'administrative-boundaries',
        identity: { bbox: [1, 2, 3, 4] },
        ttlMs: 15_000,
      },
      () => Promise.resolve({ type: 'FeatureCollection' }),
    );

    const ttl = set.mock.calls.find(
      ([key]) => !String(key).includes(':generation:'),
    )?.[2] as number;
    expect(ttl).toBeGreaterThanOrEqual(15_000);
    expect(ttl).toBeLessThan(16_500);
  });

  it('uses generation invalidation without scanning keys', async () => {
    const { cache } = createMemoryCache();
    const service = new ApplicationCacheService(cache);
    const loader = jest.fn(() => Promise.resolve(loader.mock.calls.length));
    const options = {
      namespace: 'report-categories' as const,
      identity: { active: true },
      ttlMs: 60_000,
    };

    await service.getOrSet(options, loader);
    await service.invalidate('report-categories');
    await service.getOrSet(options, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent misses into one loader call', async () => {
    const { cache } = createMemoryCache();
    const service = new ApplicationCacheService(cache);
    let resolveLoader: ((value: string) => void) | undefined;
    const loader = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );
    const options = {
      namespace: 'field-officer-summary' as const,
      identity: { assignmentId: 'assignment-a' },
      ttlMs: 10_000,
    };

    const first = service.getOrSet(options, loader);
    await new Promise((resolve) => setImmediate(resolve));
    const second = service.getOrSet(options, loader);
    resolveLoader?.('ok');

    await expect(Promise.all([first, second])).resolves.toEqual(['ok', 'ok']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('falls back to the loader when Redis reads fail', async () => {
    const cache = {
      get: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as Cache;
    const service = new ApplicationCacheService(cache);

    await expect(
      service.getOrSet(
        {
          namespace: 'jaring-occupations',
          identity: {},
          ttlMs: 60_000,
        },
        () => Promise.resolve(['database']),
      ),
    ).resolves.toEqual(['database']);
  });
});

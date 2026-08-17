import { createHash, randomUUID } from 'node:crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { markRequestCacheStatus } from '../../common/performance/performance-context.js';
import { env } from '../../lib/env.js';

export type CacheNamespace =
  | 'administrative-area-tree'
  | 'administrative-boundaries'
  | 'dashboard-briefing'
  | 'executive-dashboard-v1'
  | 'field-officer-summary'
  | 'jaring-occupations'
  | 'map-markers'
  | 'report-categories';

type CacheLoadOptions = {
  namespace: CacheNamespace;
  identity: unknown;
  ttlMs: number;
};

@Injectable()
export class ApplicationCacheService {
  private readonly logger = new Logger(ApplicationCacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getOrSet<T>(
    options: CacheLoadOptions,
    loader: () => Promise<T>,
  ): Promise<T> {
    if (!env.cache.enabled || !env.cache.redisUrl) {
      markRequestCacheStatus('BYPASS');
      return loader();
    }

    let key: string;
    try {
      const lookup = await this.cacheOperation(
        (async () => {
          const resolvedKey = await this.buildKey(
            options.namespace,
            options.identity,
          );
          return {
            key: resolvedKey,
            cached: await this.cache.get<T>(resolvedKey),
          };
        })(),
      );
      key = lookup.key;
      const { cached } = lookup;
      if (cached !== undefined && cached !== null) {
        markRequestCacheStatus('HIT');
        return cached;
      }
      markRequestCacheStatus('MISS');
    } catch (error) {
      this.logCacheError('get', options.namespace, error);
      markRequestCacheStatus('ERROR');
      return loader();
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const promise = loader()
      .then(async (value) => {
        const jitter = Math.floor(options.ttlMs * Math.random() * 0.1);
        try {
          await this.cacheOperation(
            this.cache.set(key, value, options.ttlMs + jitter),
          );
        } catch (error) {
          this.logCacheError('set', options.namespace, error);
          markRequestCacheStatus('ERROR');
        }
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  async invalidate(...namespaces: CacheNamespace[]): Promise<void> {
    if (!env.cache.enabled || !env.cache.redisUrl) return;

    await Promise.all(
      namespaces.map(async (namespace) => {
        try {
          await this.cacheOperation(
            this.cache.set(
              this.generationKey(namespace),
              `${Date.now()}-${randomUUID()}`,
              0,
            ),
          );
        } catch (error) {
          this.logCacheError('invalidate', namespace, error);
        }
      }),
    );
  }

  async health(): Promise<{
    enabled: boolean;
    ok: boolean;
    status: 'disabled' | 'ready' | 'degraded';
  }> {
    if (!env.cache.enabled || !env.cache.redisUrl) {
      return { enabled: false, ok: true, status: 'disabled' };
    }

    const key = `${env.cache.prefix}:health:${randomUUID()}`;
    try {
      const value = await this.cacheOperation(
        (async () => {
          await this.cache.set(key, 'ok', 5_000);
          const stored = await this.cache.get<string>(key);
          await this.cache.del(key);
          return stored;
        })(),
      );
      return {
        enabled: true,
        ok: value === 'ok',
        status: value === 'ok' ? 'ready' : 'degraded',
      };
    } catch {
      return { enabled: true, ok: false, status: 'degraded' };
    }
  }

  private async buildKey(
    namespace: CacheNamespace,
    identity: unknown,
  ): Promise<string> {
    const generation =
      (await this.cache.get<string>(this.generationKey(namespace))) ?? '1';
    const fingerprint = createHash('sha256')
      .update(stableSerialize(identity))
      .digest('hex');
    return `${env.cache.prefix}:v1:${namespace}:${generation}:${fingerprint}`;
  }

  private generationKey(namespace: CacheNamespace): string {
    return `${env.cache.prefix}:generation:${namespace}`;
  }

  private cacheOperation<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Redis operation timed out.')),
        env.cache.operationTimeoutMs,
      );
      operation.then(
        (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          clearTimeout(timeout);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }

  private logCacheError(
    operation: string,
    namespace: CacheNamespace,
    error: unknown,
  ): void {
    this.logger.warn(
      JSON.stringify({
        event: 'cache_error',
        operation,
        namespace,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export function authorizationScopeIdentity(context: AuthorizationContext) {
  return {
    authRole: context.authRole,
    roleCode: context.roleCode,
    primaryAssignmentId: context.primaryAssignmentId,
    organizationUnitId: context.organizationUnitId,
    areaIds: context.areaScopes.map((scope) => scope.areaId).sort(),
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

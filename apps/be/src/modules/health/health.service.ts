import { access } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { env } from '../../lib/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationCacheService } from '../cache/application-cache.service.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ApplicationCacheService,
  ) {}

  async checkReadiness() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
    } catch (error) {
      this.logger.warn(
        `Readiness check database gagal: ${this.message(error)}`,
      );
      checks.database = { ok: false, detail: 'unavailable' };
    }

    try {
      const extension = await this.prisma.$queryRaw<
        Array<{ installed: boolean }>
      >`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) AS installed
      `;
      checks.postgis = { ok: extension[0]?.installed === true };
    } catch (error) {
      this.logger.warn(`Readiness check postgis gagal: ${this.message(error)}`);
      checks.postgis = { ok: false, detail: 'unavailable' };
    }

    try {
      await access(path.resolve(env.storage.root));
      checks.storage = { ok: true };
    } catch (error) {
      this.logger.warn(`Readiness check storage gagal: ${this.message(error)}`);
      checks.storage = { ok: false, detail: 'unavailable' };
    }

    const cache = await this.cache.health();
    checks.redis = {
      ok: cache.ok,
      detail: cache.status,
    };

    if (
      Object.entries(checks).some(
        ([name, check]) => name !== 'redis' && !check.ok,
      )
    ) {
      throw new ApiException(
        'DEPENDENCY_UNAVAILABLE',
        'One or more required dependencies are unavailable.',
        503,
        undefined,
        { checks },
      );
    }

    return {
      status: checks.redis.ok ? 'ready' : 'degraded',
      checks,
    };
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

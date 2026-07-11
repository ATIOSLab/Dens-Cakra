import { access } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { env } from '../../lib/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkReadiness() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
    } catch (error) {
      checks.database = { ok: false, detail: this.message(error) };
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
      checks.postgis = { ok: false, detail: this.message(error) };
    }

    try {
      await access(path.resolve(env.storage.root));
      checks.storage = { ok: true };
    } catch (error) {
      checks.storage = { ok: false, detail: this.message(error) };
    }

    if (Object.values(checks).some((check) => !check.ok)) {
      throw new ApiException(
        'DEPENDENCY_UNAVAILABLE',
        'One or more required dependencies are unavailable.',
        503,
        undefined,
        { checks },
      );
    }

    return { status: 'ready', checks };
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

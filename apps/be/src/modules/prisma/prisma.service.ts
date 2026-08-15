import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { getPerformanceContext } from '../../common/performance/performance-context.js';
import { env } from '../../lib/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

const globalForPrisma = globalThis as {
  prisma?: PrismaService;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: env.databaseUrl,
      options: '-c timezone=UTC',
    });

    super({
      adapter,
      log:
        env.performance.slowQueryMs > 0
          ? [{ emit: 'event', level: 'query' }]
          : [],
    });

    if (env.performance.slowQueryMs > 0) {
      const clientWithEvents = this as unknown as {
        $on(
          event: 'query',
          callback: (event: {
            query: string;
            duration: number;
            target: string;
          }) => void,
        ): void;
      };
      clientWithEvents.$on('query', (event) => {
        if (event.duration < env.performance.slowQueryMs) return;

        const normalized = event.query.replace(/\s+/g, ' ').trim();
        this.logger.warn(
          JSON.stringify({
            event: 'prisma_slow_query',
            requestId: getPerformanceContext()?.requestId ?? 'background',
            durationMs: event.duration,
            target: event.target,
            fingerprint: createHash('sha256')
              .update(normalized)
              .digest('hex')
              .slice(0, 16),
          }),
        );
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaService();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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
  [key: string]: any;
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

  private delegate(name: string): any {
    return Reflect.get(PrismaClient.prototype, name, this);
  }

  private removedModel(name: string): any {
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            `${name} has been removed from the schema. Use UserOperationalAssignment and UserAreaScope instead.`,
          );
        },
      },
    );
  }

  get position(): any {
    return this.removedModel('Position');
  }

  get positionAreaCoverage(): any {
    return this.removedModel('PositionAreaCoverage');
  }

  get organizationUnit(): any {
    return this.removedModel('OrganizationUnit');
  }

  get organizationUnitClosure(): any {
    return this.removedModel('OrganizationUnitClosure');
  }

  get organizationRoleSeat(): any {
    return this.removedModel('OrganizationRoleSeat');
  }

  get organizationAreaCoverage(): any {
    return this.removedModel('OrganizationAreaCoverage');
  }

  get directorateProfile(): any {
    return this.removedModel('DirectorateProfile');
  }

  get directorateCoverage(): any {
    return this.removedModel('DirectorateCoverage');
  }

  get bindaProfile(): any {
    return this.removedModel('BindaProfile');
  }

  get user(): any {
    return this.delegate('user');
  }

  get userProfile(): any {
    return this.delegate('userProfile');
  }

  get userOperationalAssignment(): any {
    return this.delegate('userOperationalAssignment');
  }

  get userAreaScope(): any {
    return this.delegate('userAreaScope');
  }

  get role(): any {
    return this.delegate('role');
  }

  get administrativeArea(): any {
    return this.delegate('administrativeArea');
  }

  get administrativeAreaClosure(): any {
    return this.delegate('administrativeAreaClosure');
  }

  get directive(): any {
    return this.delegate('directive');
  }

  get directiveVersion(): any {
    return this.delegate('directiveVersion');
  }

  get directiveRecipient(): any {
    return this.delegate('directiveRecipient');
  }

  get uukStr(): any {
    return this.delegate('uukStr');
  }

  get uukStrVersion(): any {
    return this.delegate('uukStrVersion');
  }

  get task(): any {
    return this.delegate('task');
  }

  get taskAssignment(): any {
    return this.delegate('taskAssignment');
  }

  get jaring(): any {
    return this.delegate('jaring');
  }

  get jaringCaretakerAssignment(): any {
    return this.delegate('jaringCaretakerAssignment');
  }

  get whatsAppMessage(): any {
    return this.delegate('whatsAppMessage');
  }

  get whatsAppRoutingLog(): any {
    return this.delegate('whatsAppRoutingLog');
  }

  get whatsAppReportSession(): any {
    return this.delegate('whatsAppReportSession');
  }

  get baket(): any {
    return this.delegate('baket');
  }

  get baketVersion(): any {
    return this.delegate('baketVersion');
  }

  get baketVerification(): any {
    return this.delegate('baketVerification');
  }

  get baketCoverageCheck(): any {
    return this.delegate('baketCoverageCheck');
  }

  get analysisCase(): any {
    return this.delegate('analysisCase');
  }

  get analysisVersion(): any {
    return this.delegate('analysisVersion');
  }

  get intelligenceProduct(): any {
    return this.delegate('intelligenceProduct');
  }

  get productVersion(): any {
    return this.delegate('productVersion');
  }

  get productApprovalStep(): any {
    return this.delegate('productApprovalStep');
  }

  get productDistribution(): any {
    return this.delegate('productDistribution');
  }

  get emergencyIncident(): any {
    return this.delegate('emergencyIncident');
  }

  get alert(): any {
    return this.delegate('alert');
  }

  get personnelLocationPing(): any {
    return this.delegate('personnelLocationPing');
  }

  get auditLog(): any {
    return this.delegate('auditLog');
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

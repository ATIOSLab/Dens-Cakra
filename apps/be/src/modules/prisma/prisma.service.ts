import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
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
  constructor() {
    const adapter = new PrismaPg({
      connectionString: env.databaseUrl,
    });

    super({ adapter });
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

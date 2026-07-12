import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  append(input: {
    topic: string;
    aggregateType: string;
    aggregateId: string;
    payload: Prisma.InputJsonValue;
  }) {
    return this.prisma.outboxEvent.create({ data: input });
  }
}

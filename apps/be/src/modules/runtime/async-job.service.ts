import { Injectable } from '@nestjs/common';
import {
  AsyncJobStatus,
  Prisma,
  type AsyncJob,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type EnqueueJobInput = {
  type: string;
  payload: Prisma.InputJsonValue;
  requestedById?: string;
  correlationId?: string;
  maxAttempts?: number;
  availableAt?: Date;
};

@Injectable()
export class AsyncJobService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: EnqueueJobInput): Promise<AsyncJob> {
    return this.prisma.asyncJob.create({
      data: {
        type: input.type,
        payload: input.payload,
        ...(input.requestedById ? { requestedById: input.requestedById } : {}),
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
        ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
        ...(input.availableAt ? { availableAt: input.availableAt } : {}),
      },
    });
  }

  async claimNext(
    workerId: string,
    leaseTimeoutMs: number,
  ): Promise<AsyncJob | null> {
    const leaseExpiredBefore = new Date(Date.now() - leaseTimeoutMs);
    const jobs = await this.prisma.$queryRaw<AsyncJob[]>(Prisma.sql`
      WITH candidate AS (
        SELECT "id"
        FROM "AsyncJob"
        WHERE (
          ("status" IN ('QUEUED', 'FAILED') AND "availableAt" <= now())
          OR ("status" = 'PROCESSING' AND "lockedAt" < ${leaseExpiredBefore})
        )
        AND "attempts" < "maxAttempts"
        ORDER BY "availableAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "AsyncJob" AS job
      SET
        "status" = 'PROCESSING',
        "lockedAt" = now(),
        "lockedBy" = ${workerId},
        "attempts" = job."attempts" + 1,
        "updatedAt" = now()
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING job.*
    `);

    return jobs[0] ?? null;
  }

  complete(id: string, result: Prisma.InputJsonValue): Promise<AsyncJob> {
    return this.prisma.asyncJob.update({
      where: { id },
      data: {
        status: AsyncJobStatus.SUCCEEDED,
        progress: 100,
        result,
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
  }

  async fail(job: AsyncJob, error: unknown): Promise<AsyncJob> {
    const exhausted = job.attempts >= job.maxAttempts;
    const delayMs = Math.min(60_000, 1000 * 2 ** Math.max(0, job.attempts - 1));

    return this.prisma.asyncJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? AsyncJobStatus.DEAD_LETTER : AsyncJobStatus.FAILED,
        lastError: error instanceof Error ? error.message : String(error),
        availableAt: new Date(Date.now() + delayMs),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}

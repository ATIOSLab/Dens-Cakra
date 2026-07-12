import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { env } from '../../lib/env.js';
import { AsyncJobService } from './async-job.service.js';
import { JobHandlerRegistry } from './job-handler.registry.js';

@Injectable()
export class AsyncJobWorker {
  private readonly logger = new Logger(AsyncJobWorker.name);
  private running = false;

  constructor(
    private readonly jobs: AsyncJobService,
    private readonly handlers: JobHandlerRegistry,
  ) {}

  @Interval(env.worker.pollIntervalMs)
  async processNext(): Promise<void> {
    if (!env.worker.enabled || this.running) {
      return;
    }

    this.running = true;
    try {
      const job = await this.jobs.claimNext(
        env.worker.id,
        env.worker.leaseTimeoutMs,
      );
      if (!job) {
        return;
      }

      const handler = this.handlers.get(job.type);
      if (!handler) {
        await this.jobs.fail(
          job,
          new Error(`No handler registered for ${job.type}.`),
        );
        return;
      }

      try {
        const result = await handler(job.payload);
        await this.jobs.complete(job.id, result ?? {});
      } catch (error) {
        await this.jobs.fail(job, error);
        this.logger.error(`Job ${job.id} (${job.type}) failed.`, error);
      }
    } finally {
      this.running = false;
    }
  }
}

import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AsyncJobService } from './async-job.service.js';
import { AsyncJobWorker } from './async-job.worker.js';
import { JobHandlerRegistry } from './job-handler.registry.js';
import { OutboxService } from './outbox.service.js';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AsyncJobService,
    AsyncJobWorker,
    JobHandlerRegistry,
    OutboxService,
  ],
  exports: [AsyncJobService, JobHandlerRegistry, OutboxService],
})
export class RuntimeModule {}

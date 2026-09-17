import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { IntegrationModule } from '../integrations/integration.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ApelBlasterService } from './apel-blaster.service.js';
import { ApelController } from './apel.controller.js';
import { ApelSchedulerService } from './apel-scheduler.service.js';
import { ApelService } from './apel.service.js';

@Module({
  imports: [PrismaModule, AccessModule, IntegrationModule],
  controllers: [ApelController],
  providers: [ApelService, ApelBlasterService, ApelSchedulerService],
  exports: [ApelService, ApelBlasterService, ApelSchedulerService],
})
export class ApelModule {}

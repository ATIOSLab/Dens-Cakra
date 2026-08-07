import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { ExecutiveDashboardController } from './executive-dashboard.controller.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';

@Module({
  imports: [AccessModule],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { KpiController } from './kpi.controller.js';
import { KpiExportService } from './kpi-export.service.js';
import { KpiService } from './kpi.service.js';

@Module({
  imports: [AccessModule],
  controllers: [KpiController],
  providers: [KpiService, KpiExportService],
})
export class KpiModule {}

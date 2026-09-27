import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { JaringController } from './jaring.controller.js';
import { JaringService } from './jaring.service.js';
import { JaringExportService } from './jaring-export.service.js';
import { JaringReportDataService } from './jaring-report-data.service.js';

@Module({
  imports: [AccessModule],
  controllers: [JaringController],
  providers: [JaringService, JaringExportService, JaringReportDataService],
  exports: [JaringService, JaringExportService, JaringReportDataService],
})
export class JaringModule {}

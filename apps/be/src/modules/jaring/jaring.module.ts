import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { JaringController } from './jaring.controller.js';
import { JaringService } from './jaring.service.js';
import { JaringExportService } from './jaring-export.service.js';

@Module({
  imports: [AccessModule],
  controllers: [JaringController],
  providers: [JaringService, JaringExportService],
  exports: [JaringService, JaringExportService],
})
export class JaringModule {}

import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { AreaController } from './area.controller.js';
import { AreaQueryService } from './area-query.service.js';
import { AreaService } from './area.service.js';
@Module({
  imports: [AccessModule, SpatialModule],
  controllers: [AreaController],
  providers: [AreaService, AreaQueryService],
})
export class AreaModule {}
